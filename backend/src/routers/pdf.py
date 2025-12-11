from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict
import io
import os
import sys
from pathlib import Path
import traceback
import warnings

# Suppress warnings for Python 3.14
if sys.version_info >= (3, 14):
    warnings.filterwarnings("ignore")

import segno  # ✅ Pure Python QR - NO Pillow!
import base64
from datetime import datetime
from io import BytesIO  # ✅ MISSING!

# ============================================
# WeasyPrint DLL Setup for Windows
# ============================================
if sys.platform == 'win32':
    dll_dir = r'C:\msys64\mingw64\bin'
    if os.path.exists(dll_dir):
        os.environ['WEASYPRINT_DLL_DIRECTORIES'] = dll_dir
        os.environ['PATH'] = dll_dir + os.pathsep + os.environ.get('PATH', '')
        print(f"✅ Set WeasyPrint DLL directory: {dll_dir}")
    else:
        print(f"⚠️  Warning: DLL directory not found: {dll_dir}")

from weasyprint import HTML

# Import your backend modules
from ..database import get_db
from ..models import User
from ..auth import get_current_user
from pydantic import BaseModel

# Lazy Firebase initialization
_firebase_initialized = False
_firebase_error = None
_firebase_modules = None

def _initialize_firebase():
    """Lazy initialization of Firebase to avoid import-time errors on Python 3.14"""
    global _firebase_initialized, _firebase_error, _firebase_modules
    
    # If already attempted, return cached result
    if _firebase_initialized:
        return _firebase_modules
    
    try:
        import firebase_admin
        from firebase_admin import credentials, storage
        
        # Check if Firebase is already initialized by another process
        if firebase_admin._apps:
            print("✅ Firebase already initialized")
            _firebase_modules = (firebase_admin, credentials, storage)
            _firebase_initialized = True
            return _firebase_modules
        
        # Try to get path from environment variable first
        firebase_credentials_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        
        # If not set, use relative path from this file's directory
        if not firebase_credentials_path:
            # Get the path relative to the backend directory
            current_dir = Path(__file__).parent.parent.parent  # Goes from pdf.py -> routers -> src -> backend
            firebase_credentials_path = current_dir / "firebase-service-account.json"
        else:
            firebase_credentials_path = Path(firebase_credentials_path)
        
        print(f"[DEBUG] Looking for Firebase credentials at: {firebase_credentials_path}")
        print(f"[DEBUG] File exists: {firebase_credentials_path.exists()}")
        
        if firebase_credentials_path.exists():
            print(f"[DEBUG] Loading Firebase credentials from: {firebase_credentials_path}")
            try:
                cred = credentials.Certificate(str(firebase_credentials_path))
                
                # Get bucket name from credentials or env or use default
                bucket_name = os.getenv('FIREBASE_STORAGE_BUCKET')
                if not bucket_name:
                    # Try to read from credentials
                    with open(str(firebase_credentials_path), 'r') as f:
                        import json
                        creds_data = json.load(f)
                        bucket_name = creds_data.get('project_id', '') + '.appspot.com'
                
                print(f"[DEBUG] Using bucket: {bucket_name}")
                
                firebase_admin.initialize_app(cred, {
                    'storageBucket': bucket_name
                })
                print("✅ Firebase initialized successfully")
                _firebase_modules = (firebase_admin, credentials, storage)
            except Exception as init_error:
                print(f"❌ Failed to initialize Firebase: {type(init_error).__name__}: {init_error}")
                import traceback
                traceback.print_exc()
                _firebase_modules = (None, None, None)
        else:
            print(f"⚠️ Firebase credentials not found at: {firebase_credentials_path}")
            _firebase_modules = (None, None, None)
        
        _firebase_initialized = True
        return _firebase_modules
    except Exception as e:
        _firebase_error = str(e)
        print(f"⚠️ Firebase initialization error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        _firebase_initialized = True  # Mark as attempted to avoid retries
        _firebase_modules = (None, None, None)
        return _firebase_modules


# ============================================
# Router Setup
# ============================================
router = APIRouter(prefix="/api/pdf", tags=["pdf"])

# Get template directory path
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
print(f"📁 Template directory: {TEMPLATE_DIR}")

# ============================================
# Pydantic Models
# ============================================
class DayItinerary(BaseModel):
    day: int
    date: str
    municipality: str
    items: List[Dict]

class ItineraryPDFRequest(BaseModel):
    start_date: str
    end_date: str
    budget: int
    days: List[DayItinerary]
    adults: int
    children: int
    seniors: int

# ============================================
# Template Loading Functions
# ============================================
def load_template(template_name: str) -> str:
    """Load HTML template from file"""
    template_path = TEMPLATE_DIR / template_name
    
    print(f"📂 Looking for template at: {template_path}")
    
    if not template_path.exists():
        print(f"❌ Template NOT found at: {template_path}")
        raise FileNotFoundError(f"Template not found: {template_path}")
    
    print(f"✅ Template found!")
    
    with open(template_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"📄 Template loaded: {len(content)} characters")
    return content

def generate_days_html(days: List[DayItinerary]) -> str:
    """Generate HTML for all days in the itinerary using calendar design"""
    print(f"🗓️  Generating HTML for {len(days)} days...")
    days_html = ""
    
    for day_data in days:
        # Parse and reformat date if needed
        date_text = day_data.date
        
        # Try to reformat the date to "Dec 27, Sat" format
        try:
            # Handle different date formats
            if ',' in date_text:
                parts = date_text.split(',')
                if len(parts) >= 2:
                    # If format is "Sat, Dec 27" -> reformat to "Dec 27, Sat"
                    weekday = parts[0].strip()
                    rest = parts[1].strip()
                    date_text = f"{rest}, {weekday}"
        except:
            pass  # Keep original format if parsing fails
        
        # Generate activity items for this day
        activities_html = ""
        
        if day_data.items and len(day_data.items) > 0:
            # Has activities - show the list
            activities_list = ""
            for idx, item in enumerate(day_data.items, 1):
                activities_list += f"""
                <li class="activity-item">
                    <div class="activity-item-inner">
                        <div class="activity-number-cell">
                            <span class="activity-number">{idx}</span>
                        </div>
                        <div class="activity-details-cell">
                            <div class="activity-name">{item.get('name', 'Unnamed Location')}</div>
                            <div class="activity-description">{item.get('description', 'No description available')}</div>
                        </div>
                    </div>
                </li>
                """
            
            activities_html = f"""
            <div class="activity-box">
                <p class="municipality-info">📍 <strong>{day_data.municipality or 'Not specified'}</strong></p>
                <ul class="activity-list">
                    {activities_list}
                </ul>
            </div>
            """
        else:
            # No activities - show empty state
            activities_html = """
            <div class="activity-box empty">
                <div class="activity-text">No Activities</div>
            </div>
            """
        
        # Build day section with pill badge and lines perfectly centered
        days_html += f"""
        <div class="date-section">
            <div class="date-header">
                <div class="date-header-wrapper">
                    <div class="date-lines"></div>
                    <div class="date-badge-container">
                        <span class="date-badge">
                            <span class="calendar-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </span>
                            <span class="date-badge-text">{date_text}</span>
                        </span>
                    </div>
                </div>
            </div>
            {activities_html}
        </div>
        """
    
    print(f"✅ Days HTML generated: {len(days_html)} characters")
    return days_html



def generate_html_from_template(data: ItineraryPDFRequest) -> str:
    """Generate final HTML by loading template and replacing placeholders"""
    
    print("🔄 Starting HTML generation from template...")
    
    # Load the template file
    template = load_template("itinerary.html")
    
    # Calculate values
    total_travelers = data.adults + data.children + data.seniors
    days_html = generate_days_html(data.days)
    
    # Define all placeholders and their values
    replacements = {
        "{{ title }}": "Catanduanes Travel Itinerary",
        "{{ subtitle }}": "Your personalized journey through the Happy Island",
        "{{ generation_date }}": f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        "{{ start_date }}": data.start_date,
        "{{ end_date }}": data.end_date,
        "{{ budget }}": f"{data.budget:,}",
        "{{ total_travelers }}": str(total_travelers),
        "{{ total_days }}": str(len(data.days)),
        "{{ adults }}": str(data.adults),
        "{{ children }}": str(data.children),
        "{{ seniors }}": str(data.seniors),
        "{{ days_content }}": days_html,
    }
    
    # Replace all placeholders in template
    html = template
    for placeholder, value in replacements.items():
        html = html.replace(placeholder, value)
    
    print(f"✅ Final HTML generated: {len(html)} characters")
    return html

# ============================================
# API Endpoints
# ============================================
@router.post("/generate")
async def generate_itinerary_pdf(
    pdf_data: ItineraryPDFRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate PDF from itinerary data (requires authentication)
    """
    try:
        firebase_admin, credentials, storage = _initialize_firebase()  # Get Firebase modules
        
        print("\n" + "="*60)
        print("🔐 AUTHENTICATED PDF GENERATION")
        print("="*60)
        
        # Generate HTML from template
        html_content = generate_html_from_template(pdf_data)
        
        # Convert HTML to PDF
        print("🖨️  Converting HTML to PDF...")
        pdf_bytes = HTML(string=html_content).write_pdf()
        print(f"✅ PDF generated: {len(pdf_bytes)} bytes")
        
        # Create filename
        filename = f"Catanduanes_Itinerary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        print(f"📥 Sending PDF: {filename}")
        print("="*60 + "\n")
        
        # Return PDF as download
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    
    except Exception as e:
        print("\n" + "="*60)
        print("❌ ERROR IN AUTHENTICATED PDF GENERATION")
        print("="*60)
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print("\nFull Traceback:")
        print(traceback.format_exc())
        print("="*60 + "\n")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )

@router.get("/info")
async def get_pdf_info():
    """
    Get information about PDF generation setup
    """
    template_path = TEMPLATE_DIR / "itinerary.html"
    template_exists = template_path.exists()
    
    return {
        "template_dir": str(TEMPLATE_DIR),
        "template_path": str(template_path),
        "template_exists": template_exists,
        "message": "PDF generation ready" if template_exists else "Template not found - please create itinerary.html"
    }

@router.get("/debug-template")
async def debug_template():
    """
    Debug endpoint to check template loading
    """
    try:
        template_path = TEMPLATE_DIR / "itinerary.html"
        
        # Check directory and file existence
        dir_exists = TEMPLATE_DIR.exists()
        file_exists = template_path.exists()
        
        # Try to load template
        template_content = None
        error = None
        template_length = 0
        
        try:
            template_content = load_template("itinerary.html")
            template_length = len(template_content)
        except Exception as e:
            error = str(e)
        
        return {
            "template_dir": str(TEMPLATE_DIR),
            "template_dir_exists": dir_exists,
            "template_path": str(template_path),
            "template_file_exists": file_exists,
            "template_loaded": template_content is not None,
            "template_length": template_length,
            "error": error,
            "first_100_chars": template_content[:100] if template_content else None
        }
    
    except Exception as e:
        return {
            "error": str(e),
            "error_type": str(type(e).__name__)
        }
        
@router.post("/generate-public")
async def generate_pdf_qr_public(data: ItineraryPDFRequest):
    try:
        print("\n" + "="*60)
        print("🚀 Starting PDF + Firebase + QR generation...")
        print("="*60)
        
        firebase_admin, credentials, storage = _initialize_firebase()  # Get Firebase modules
        
        print(f"[DEBUG] Firebase modules returned: firebase_admin={firebase_admin is not None}, credentials={credentials is not None}, storage={storage is not None}")
        
        # 1. Generate HTML using YOUR existing function
        html_content = generate_html_from_template(data)
        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf()
        print(f"✅ PDF generated: {len(pdf_bytes)} bytes")
        
        # 2. Upload to Firebase Storage
        if storage is None:
            print("⚠️ Firebase not initialized, returning PDF without upload")
            # Return base64 encoded PDF instead
            pdf_base64 = base64.b64encode(pdf_bytes).decode()
            
            # Generate QR code without URL
            qr = segno.make("Itinerary PDF - Save locally")
            img_buffer = BytesIO()
            qr.save(img_buffer, scale=10, kind='png')
            qr_base64 = base64.b64encode(img_buffer.getvalue()).decode()
            
            return {
                "success": True,
                "pdfUrl": f"data:application/pdf;base64,{pdf_base64}",
                "qrCodeBase64": f"data:image/png;base64,{qr_base64}",
                "filename": "itinerary.pdf",
                "message": "PDF generated but Firebase not available. Download directly."
            }
        
        # Firebase is initialized - proceed with upload
        print("[DEBUG] Firebase is initialized, attempting upload...")
        try:
            bucket = storage.bucket()
            print(f"[DEBUG] Bucket: {bucket.name}")
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"itineraries/catanduanes_{timestamp}.pdf"
            blob = bucket.blob(filename)
            
            print(f"[DEBUG] Uploading {len(pdf_bytes)} bytes to {filename}...")
            blob.upload_from_string(pdf_bytes, content_type='application/pdf')
            print(f"[DEBUG] Upload complete, making public...")
            blob.make_public()
            
            pdf_url = blob.public_url
            print(f"✅ PDF uploaded to Firebase: {pdf_url}")
            
            # 3. Generate QR code with segno (NO Pillow!)
            qr = segno.make(pdf_url)
            img_buffer = BytesIO()
            qr.save(img_buffer, scale=10, kind='png')
            qr_base64 = base64.b64encode(img_buffer.getvalue()).decode()
            print("✅ QR code generated successfully!")
            
            return {
                "success": True,
                "pdfUrl": pdf_url,
                "qrCodeBase64": f"data:image/png;base64,{qr_base64}",
                "filename": filename
            }
        except Exception as firebase_error:
            print(f"❌ Firebase upload error: {type(firebase_error).__name__}: {firebase_error}")
            import traceback
            traceback.print_exc()
            
            # Fallback to base64 if Firebase upload fails
            print("⚠️ Firebase upload failed, falling back to base64 PDF...")
            pdf_base64 = base64.b64encode(pdf_bytes).decode()
            qr = segno.make("Itinerary PDF - Save locally")
            img_buffer = BytesIO()
            qr.save(img_buffer, scale=10, kind='png')
            qr_base64 = base64.b64encode(img_buffer.getvalue()).decode()
            
            return {
                "success": True,
                "pdfUrl": f"data:application/pdf;base64,{pdf_base64}",
                "qrCodeBase64": f"data:image/png;base64,{qr_base64}",
                "filename": "itinerary.pdf",
                "message": f"PDF generated. Firebase upload failed: {str(firebase_error)}"
            }
        
    except Exception as e:
        print(f"❌ Error generating PDF+QR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF+QR failed: {str(e)}")