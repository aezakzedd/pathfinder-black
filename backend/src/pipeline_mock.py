"""
Mock Pipeline for AI services when ChromaDB is unavailable.
This provides fallback AI responses using GeoJSON data per municipality.
"""

import json
import os
import yaml
from typing import Tuple, List, Dict
from pathlib import Path

class MockPipeline:
    """Mock implementation of AI Pipeline without ChromaDB dependency"""
    
    def __init__(self, dataset_path="dataset/dataset.json", config_path="config/config.yaml"):
        print("[INFO] Initializing Mock Pipeline (ChromaDB unavailable)...")
        
        self.config = self._load_config(config_path)
        self.dataset = self._load_dataset(dataset_path)
        self.places_data = self.config.get('places', {})
        
        # Cache for loaded geojson files
        self.geojson_cache = {}
        
        # Get the frontend data directory
        # From: backend/src/pipeline_mock.py
        # To: frontend/public/data/
        # Path: backend/src/ -> .. -> .. (to Pathfinderv2 root) -> frontend/public/data/
        from pathlib import Path
        current_file = Path(__file__).resolve()
        pathfinder_root = current_file.parent.parent.parent  # From src/ to backend/ to Pathfinderv2/
        self.geojson_dir = str(pathfinder_root / "frontend" / "public" / "data")
        
        print(f"[INFO] GeoJSON directory: {self.geojson_dir}")
        print("[INFO] [OK] Mock Pipeline initialized successfully!")
    
    def _load_config(self, config_path):
        """Load configuration from YAML"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"[WARNING] Could not load config: {e}")
            return {'places': {}, 'keywords': {}, 'system': {}}
    
    def _load_dataset(self, dataset_path):
        """Load dataset from JSON"""
        try:
            with open(dataset_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARNING] Could not load dataset: {e}")
            return []
    
    def _load_geojson(self, municipality: str) -> List[Dict]:
        """
        Load GeoJSON data for a specific municipality.
        Returns a list of features with extracted properties.
        """
        if not municipality:
            return []
        
        # Check cache first
        if municipality in self.geojson_cache:
            return self.geojson_cache[municipality]
        
        # Convert municipality to proper filename (e.g., "VIRAC" -> "VIRAC.geojson")
        geojson_path = os.path.join(self.geojson_dir, f"{municipality.upper()}.geojson")
        
        features = []
        try:
            if os.path.exists(geojson_path):
                with open(geojson_path, 'r', encoding='utf-8') as f:
                    geojson_data = json.load(f)
                
                # Extract features from FeatureCollection
                if geojson_data.get('type') == 'FeatureCollection':
                    for feature in geojson_data.get('features', []):
                        props = feature.get('properties', {})
                        geom = feature.get('geometry', {})
                        
                        # Extract coordinates (GeoJSON uses [lng, lat])
                        coords = geom.get('coordinates', [124.5, 13.5])
                        
                        feature_data = {
                            'name': props.get('name', ''),
                            'type': props.get('type', 'ATTRACTION'),
                            'municipality': props.get('municipality', municipality),
                            'description': props.get('description', ''),
                            'lng': coords[0] if len(coords) > 0 else 124.5,
                            'lat': coords[1] if len(coords) > 1 else 13.5,
                            'coordinates': {
                                'lat': coords[1] if len(coords) > 1 else 13.5,
                                'lng': coords[0] if len(coords) > 0 else 124.5
                            }
                        }
                        features.append(feature_data)
                
                print(f"[INFO] Loaded {len(features)} places from {municipality}")
            else:
                print(f"[WARNING] GeoJSON file not found: {geojson_path}")
        
        except Exception as e:
            print(f"[ERROR] Failed to load GeoJSON for {municipality}: {e}")
        
        # Cache the result
        self.geojson_cache[municipality] = features
        return features
    
    def ask(self, user_input: str, municipality: str = None) -> Tuple[str, List[str]]:
        """
        Generate AI response based on user input.
        Returns (answer, list_of_place_names)
        
        Args:
            user_input: The user's query
            municipality: Optional municipality to filter places (e.g., "VIRAC")
        """
        
        place_names = []
        query_lower = user_input.lower()
        
        # If municipality is specified, load and search in geojson data
        if municipality:
            geojson_places = self._load_geojson(municipality)
            
            # Map activity keywords to place types in geojson
            activity_type_map = {
                'beach': ['BEACHES'],
                'swimming': ['BEACHES'],
                'surf': ['BEACHES'],
                'waterfall': ['FALLS'],
                'fall': ['FALLS'],
                'hiking': ['TRAILS', 'HIKING', 'VIEWPOINTS'],
                'hike': ['TRAILS', 'HIKING', 'VIEWPOINTS'],
                'food': ['RESTAURANTS & CAFES'],
                'eat': ['RESTAURANTS & CAFES'],
                'restaurant': ['RESTAURANTS & CAFES'],
                'hotel': ['HOTELS & RESORTS'],
                'resort': ['HOTELS & RESORTS'],
                'stay': ['HOTELS & RESORTS'],
                'church': ['CHURCHES'],
                'viewpoint': ['VIEWPOINTS'],
                'view': ['VIEWPOINTS'],
                'market': ['MARKETS'],
            }
            
            # Search for matching place types in geojson
            found_types = set()
            for keyword, place_types in activity_type_map.items():
                if keyword in query_lower:
                    found_types.update(place_types)
            
            # If we found matching types, get places of those types
            if found_types:
                for place in geojson_places:
                    if place['type'] in found_types:
                        place_names.append(place['name'])
            else:
                # No specific keywords found, return diverse places from municipality
                # Group places by type for variety
                places_by_type = {}
                for place in geojson_places:
                    ptype = place['type']
                    if ptype not in places_by_type:
                        places_by_type[ptype] = []
                    places_by_type[ptype].append(place['name'])
                
                # Select 2-3 places from each type for variety
                for ptype, places in places_by_type.items():
                    place_names.extend(places[:3])
            
            # Limit to reasonable number (enough for multiple days with variety)
            place_names = place_names[:15]
            print(f"[INFO] Found {len(place_names)} places for {municipality}")
        else:
            # Fallback to hardcoded places if no municipality specified
            for place_name in self.places_data.keys():
                place_lower = place_name.lower()
                if place_lower in query_lower or place_name.replace(' ', '').lower() in query_lower.replace(' ', ''):
                    place_names.append(place_name)
            
            # If no exact matches, look for activity-based keywords (legacy behavior)
            if not place_names:
                activity_keywords = {
                    'beach': ['Puraran Beach', 'Twin Rock Beach', 'Mamangal Beach', 'Tres Karas de Kristo/Face of Jesus Beach'],
                    'swimming': ['Puraran Beach', 'Twin Rock Beach', 'Mamangal Beach', 'Tuwad-Tuwadan Blue Lagoon'],
                    'surf': ['Puraran Beach', 'Twin Rock Beach', 'Pacific Surfers Paradise Resort'],
                    'waterfall': ['Maribina Falls', 'Nahulugan Falls', 'Ba-Haw Falls'],
                    'hiking': ['Maribina Falls', 'Nahulugan Falls', 'Ba-Haw Falls', 'Binurong Point'],
                    'food': ['Virac Public Market', 'Virac Town Center'],
                    'market': ['Virac Public Market'],
                    'church': ['St. John the Baptist Church'],
                    'hotel': ['ARDCI Corporate Inn', 'Rhaj Inn', 'Majestic Puraran Beach Resort', 'Nitto Lodge'],
                    'resort': ['Pacific Surfers Paradise Resort', 'Catanduanes Midtown Inn Resort', 'Majestic Puraran Beach Resort'],
                }
                
                for keyword, places in activity_keywords.items():
                    if keyword in query_lower:
                        place_names.extend(places)
                        break
            
            place_names = list(dict.fromkeys(place_names))[:5]
        
        # Search dataset for relevant Q&A
        answer = self._search_dataset(user_input)
        
        return answer, place_names
    
    def _search_dataset(self, query: str) -> str:
        """Search dataset for relevant answers with better matching"""
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        best_match = None
        best_score = 0
        
        # Score each entry based on word overlap
        for item in self.dataset:
            if not isinstance(item, dict):
                continue
                
            input_text = (item.get('input', '') or '').lower()
            title = (item.get('title', '') or '').lower()
            topic = (item.get('topic', '') or '').lower()
            output = item.get('output', item.get('answer', ''))
            
            if not output:
                continue
            
            # Calculate relevance score
            score = 0
            
            # Check for word matches in input and title
            input_words = set(input_text.split())
            title_words = set(title.split())
            
            # Exact word matches in input (highest priority)
            input_overlap = len(query_words & input_words)
            score += input_overlap * 3
            
            # Word matches in title
            title_overlap = len(query_words & title_words)
            score += title_overlap * 2
            
            # Check for phrase matches
            if query_lower in input_text:
                score += 10
            if query_lower in title:
                score += 8
            
            # Check if query contains key topic words
            if 'beach' in query_lower and any(w in title for w in ['beach', 'surfing', 'water']):
                score += 2
            if 'food' in query_lower or 'eat' in query_lower and 'restaurant' in title.lower():
                score += 2
            if 'hotel' in query_lower or 'stay' in query_lower and ('hotel' in title.lower() or 'accommodation' in title.lower()):
                score += 2
            
            # Keep track of best match so far
            if score > best_score:
                best_score = score
                best_match = output
        
        # If no good match found, return a generic response
        if best_match is None:
            return f"I found some information about attractions in Catanduanes. You can explore the map to find places matching your interests like '{query}'."
        
        return str(best_match)
    
    def get_place_data(self, place_names: List[str], municipality: str = None) -> List[Dict]:
        """
        Get location data for places.
        
        Args:
            place_names: List of place names to look up
            municipality: Optional municipality to filter places
        
        Returns:
            List of place data with coordinates and details
        """
        places = []
        
        # If municipality is specified, search in geojson data
        if municipality:
            geojson_places = self._load_geojson(municipality)
            
            # Create a mapping of place name to data for faster lookup
            place_map = {p['name']: p for p in geojson_places}
            
            # Match requested place names to geojson places
            for place_name in place_names:
                if place_name in place_map:
                    place_data = place_map[place_name]
                    category = self._map_type_to_category(place_data['type'])
                    places.append({
                        'name': place_data['name'],
                        'lat': place_data['lat'],
                        'lng': place_data['lng'],
                        'type': place_data['type'],
                        'category': category,
                        'coordinates': place_data['coordinates'],
                        'description': place_data.get('description', ''),
                        'municipality': place_data.get('municipality', municipality)
                    })
        else:
            # Fallback to hardcoded places_data
            for place_name in place_names:
                if place_name in self.places_data:
                    place_info = self.places_data[place_name]
                    places.append({
                        'name': place_name.replace('_', ' '),
                        'lat': place_info.get('lat', 13.5),
                        'lng': place_info.get('lng', 124.5),
                        'type': place_info.get('type', 'attraction'),
                        'coordinates': {
                            'lat': place_info.get('lat', 13.5),
                            'lng': place_info.get('lng', 124.5)
                        }
                    })
        
        return places
    
    def _map_type_to_category(self, place_type: str) -> str:
        """
        Map GeoJSON place type to frontend category ID.
        
        Categories:
        - hotels: HOTELS & RESORTS
        - restaurants: RESTAURANTS & CAFES
        - falls: FALLS
        - viewpoints: VIEWPOINTS, TRAILS, HIKING
        - religious: CHURCHES
        - nature: BEACHES, FALLS, TRAILS, HIKING, VIEWPOINTS
        
        Args:
            place_type: The place type from GeoJSON (e.g., "HOTELS & RESORTS")
        
        Returns:
            Category ID that matches frontend categories
        """
        place_type_upper = place_type.upper() if place_type else ""
        
        # Map to category IDs used in frontend
        if 'HOTEL' in place_type_upper or 'RESORT' in place_type_upper:
            return 'hotels'
        elif 'RESTAURANT' in place_type_upper or 'CAFE' in place_type_upper or 'FOOD' in place_type_upper:
            return 'restaurants'
        elif 'CHURCH' in place_type_upper or 'RELIGIOUS' in place_type_upper:
            return 'religious'
        elif 'BEACH' in place_type_upper:
            return 'falls'  # Group with nature activities
        elif 'FALL' in place_type_upper:
            return 'falls'
        elif 'TRAIL' in place_type_upper or 'HIKING' in place_type_upper or 'VIEWPOINT' in place_type_upper:
            return 'viewpoints'
        else:
            return 'viewpoints'  # Default fallback
