from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import sys
import os
import warnings

# Suppress warnings for Python 3.14+
if sys.version_info >= (3, 14):
    warnings.filterwarnings("ignore")

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Initialize pipeline at startup with better error handling
_pipeline = None
_pipeline_error = None

def _init_pipeline_safely():
    """Initialize pipeline with comprehensive error logging"""
    global _pipeline, _pipeline_error
    
    try:
        print("[INFO] Starting AI Pipeline initialization...")
        from pipeline import Pipeline
        
        dataset_path = os.path.join(os.path.dirname(__file__), "..", "dataset", "dataset.json")
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "config.yaml")
        
        print(f"[DEBUG] Dataset path: {dataset_path}")
        print(f"[DEBUG] Config path: {config_path}")
        print(f"[DEBUG] Files exist - Dataset: {os.path.exists(dataset_path)}, Config: {os.path.exists(config_path)}")
        
        # Check if files exist
        if not os.path.exists(dataset_path):
            raise FileNotFoundError(f"Dataset not found: {dataset_path}")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config not found: {config_path}")
        
        print("[INFO] Required files found, initializing Pipeline...")
        _pipeline = Pipeline(dataset_path=dataset_path, config_path=config_path)
        print("[INFO] [OK] AI Pipeline initialized successfully!")
        return _pipeline
        
    except Exception as e:
        _pipeline_error = str(e)
        print(f"[WARNING] Full Pipeline initialization failed: {type(e).__name__}: {e}")
        print("[INFO] Falling back to Mock Pipeline...")
        
        try:
            from pipeline_mock import MockPipeline
            dataset_path = os.path.join(os.path.dirname(__file__), "..", "dataset", "dataset.json")
            config_path = os.path.join(os.path.dirname(__file__), "..", "config", "config.yaml")
            _pipeline = MockPipeline(dataset_path=dataset_path, config_path=config_path)
            print("[INFO] [OK] Mock Pipeline initialized successfully!")
            return _pipeline
        except Exception as mock_error:
            print(f"[ERROR] Mock Pipeline also failed: {mock_error}")
            _pipeline = False
            return None

def get_pipeline():
    """Get the initialized pipeline"""
    global _pipeline
    return _pipeline if _pipeline is not False else None

# Initialize pipeline on module import
print("[INFO] Loading AI router...")
_init_pipeline_safely()

class ChatMessage(BaseModel):
    message: str
    preferences: Optional[List[str]] = None  # User preferences like ["Swimming", "Hiking"]
    municipality: Optional[str] = None

class ItineraryRequest(BaseModel):
    municipality: str
    preferences: List[str]
    days: int
    budget: int

class PlaceInfo(BaseModel):
    name: str
    lat: float
    lng: float
    type: str
    coordinates: Optional[Dict] = None

class ChatResponse(BaseModel):
    answer: str
    places: List[PlaceInfo] = []
    suggested_itinerary: Optional[Dict] = None

@router.post("/chat", response_model=ChatResponse)
async def chat_with_pathfinder(request: ChatMessage):
    """Chat with Pathfinder AI and get recommendations"""
    pipeline = get_pipeline()
    
    # Fallback response if pipeline isn't ready
    if pipeline is None:
        print("[WARNING] Pipeline not available, returning fallback response")
        return ChatResponse(
            answer="The AI system is initializing. Please try again in a moment. In the meantime, you can manually select attractions from the map.",
            places=[]
        )
    
    try:
        # Get AI response from pipeline, passing municipality if available
        answer, places = pipeline.ask(request.message, request.municipality)
        
        # Convert places to PlaceInfo objects
        places_data = pipeline.get_place_data(places, request.municipality)
        place_infos = [
            PlaceInfo(
                name=p['name'],
                lat=p['lat'],
                lng=p['lng'],
                type=p['type'],
                coordinates={"lat": p['lat'], "lng": p['lng']}
            )
            for p in places_data
        ]
        
        return ChatResponse(
            answer=answer,
            places=place_infos
        )
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"[ERROR] Chat endpoint error: {error_details}")
        
        # Return fallback response with error info
        return ChatResponse(
            answer=f"An error occurred: {str(e)}. Please refresh and try again.",
            places=[]
        )

@router.post("/generate-itinerary", response_model=Dict)
async def generate_ai_itinerary(request: ItineraryRequest):
    """Generate an AI-powered itinerary based on preferences and location"""
    pipeline = get_pipeline()
    if pipeline is None:
        raise HTTPException(status_code=500, detail="AI pipeline not available. Please try again later.")
    
    try:
        # Map preferences to AI keywords for better RAG results
        preference_keywords = {
            'Swimming': ['swim', 'waterfall', 'beach'],
            'Hiking': ['hike', 'mountain', 'trail', 'viewpoint'],
            'Surfing': ['surf', 'waves', 'beach'],
            'Sightseeing': ['visit', 'see', 'landmark', 'church'],
            'Historical': ['historical', 'church', 'heritage'],
        }
        
        # Build query from preferences
        keywords = []
        for pref in request.preferences:
            if pref in preference_keywords:
                keywords.extend(preference_keywords[pref])
        
        query = f"best attractions in {request.municipality} for {', '.join(request.preferences)}"
        
        # Get AI recommendations, passing municipality
        answer, place_names = pipeline.ask(query, request.municipality)
        places_data = pipeline.get_place_data(place_names, request.municipality)
        
        print(f"[INFO] Generated {len(place_names)} place names: {place_names}")
        print(f"[INFO] Got {len(places_data)} places data")
        
        # Create itinerary structure with better distribution
        itinerary_days = {}
        
        # Distribute places across days more intelligently
        if len(places_data) > 0:
            # Calculate places per day
            places_per_day = max(1, len(places_data) // request.days)
            remaining_places = len(places_data) % request.days
            
            place_idx = 0
            for day in range(1, request.days + 1):
                day_key = f"day_{day}"
                
                # Give extra places to the last day
                num_places = places_per_day + (1 if day == request.days else 0)
                
                day_places = places_data[place_idx:place_idx + num_places]
                place_idx += num_places
                
                itinerary_days[day_key] = {
                    "day": day,
                    "municipality": request.municipality,
                    "places": day_places,
                    "activities": [p['type'] for p in day_places]
                }
                
                print(f"[INFO] Day {day}: {len(day_places)} places")
        else:
            # No places found, create empty days
            for day in range(1, request.days + 1):
                day_key = f"day_{day}"
                itinerary_days[day_key] = {
                    "day": day,
                    "municipality": request.municipality,
                    "places": [],
                    "activities": []
                }
        
        return {
            "success": True,
            "municipality": request.municipality,
            "preferences": request.preferences,
            "days": request.days,
            "budget": request.budget,
            "ai_recommendation": answer,
            "itinerary": itinerary_days,
            "total_places": len(places_data)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/place-details")
async def get_place_details(place_name: str):
    """Get detailed information about a specific place"""
    pipeline = get_pipeline()
    if pipeline is None:
        raise HTTPException(status_code=500, detail="Pipeline not initialized. Missing dependencies: chromadb, sentence-transformers, google-generativeai")
    
    try:
        # Query the pipeline for details about the place
        query = f"Tell me about {place_name}"
        answer, _ = pipeline.ask(query)
        
        # Get coordinates if available
        if place_name in pipeline.config['places']:
            place_info = pipeline.config['places'][place_name]
            coordinates = {
                "lat": place_info['lat'],
                "lng": place_info['lng']
            }
        else:
            coordinates = None
        
        return {
            "place_name": place_name,
            "details": answer,
            "coordinates": coordinates,
            "type": pipeline.config['places'].get(place_name, {}).get('type', 'unknown')
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preferences")
async def get_activity_preferences():
    """Get available activity preferences"""
    return {
        "preferences": [
            "Swimming",
            "Hiking",
            "Surfing",
            "Sightseeing",
            "Historical",
            "Shopping",
            "Dining"
        ],
        "description": "User can select multiple preferences to customize recommendations"
    }

@router.get("/municipalities")
async def get_available_municipalities():
    """Get list of available municipalities"""
    municipalities = [
        "BAGAMANOC",
        "BARAS",
        "BATO",
        "CARAMORAN",
        "GIGMOTO",
        "PANDAN",
        "PANGANIBAN",
        "SAN ANDRES",
        "SAN MIGUEL",
        "VIGA",
        "VIRAC"
    ]
    return {
        "municipalities": municipalities,
        "total": len(municipalities)
    }

@router.get("/health")
async def health_check():
    """Check AI service health"""
    pipeline = get_pipeline()
    return {
        "status": "ok",
        "pipeline_ready": pipeline is not None,
        "message": "AI service is available" if pipeline else "AI pipeline initializing on first use..."
    }
