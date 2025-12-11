import api from './api';

let showPDFModalDeclared = false; // Prevent duplicate

const showPDFModal = (data) => {
  if (showPDFModalDeclared) return;
  showPDFModalDeclared = true;
  
  // Validate the data
  if (!data.pdfUrl) {
    console.error('❌ PDF URL is missing or invalid:', data);
    alert('Error: PDF URL is not available. Please try again.');
    showPDFModalDeclared = false;
    return;
  }
  
  if (!data.qrCodeBase64) {
    console.error('❌ QR Code is missing:', data);
    alert('Error: QR Code is not available. Please try again.');
    showPDFModalDeclared = false;
    return;
  }
  
  console.log('[PDF Modal] Received data:', {
    pdfUrl: data.pdfUrl.substring(0, 100) + (data.pdfUrl.length > 100 ? '...' : ''),
    qrCodeBase64: data.qrCodeBase64.substring(0, 50) + '...',
    filename: data.filename
  });
  
  const modal = document.createElement('div');
  modal.id = 'pdf-modal';
  modal.style.cssText = `
    position: fixed; 
    top: 0; 
    left: 0; 
    width: 100%; 
    height: 100%; 
    background: rgba(0, 0, 0, 0.4); 
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 9999;
    display: flex; 
    align-items: center; 
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(15, 15, 25, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 2.5rem;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    text-align: center;
    position: relative;
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;
  
  modalContent.innerHTML = `
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { 
          opacity: 0; 
          transform: translateY(20px);
        }
        to { 
          opacity: 1; 
          transform: translateY(0);
        }
      }
      .pdf-close-btn {
        position: absolute;
        top: 1.5rem;
        right: 1.5rem;
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.8);
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        padding: 0;
        font-weight: 300;
      }
      .pdf-close-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
      }
      .pdf-close-btn:active {
        transform: scale(0.95);
      }
      .pdf-title {
        color: rgba(255, 255, 255, 0.95);
        margin-bottom: 0.5rem;
        margin-top: 0;
        font-size: 1.8rem;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .pdf-subtitle {
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 2rem;
        font-size: 0.95rem;
        font-weight: 400;
        line-height: 1.5;
      }
      .pdf-qr-container {
        margin: 2rem 0;
        display: flex;
        justify-content: center;
      }
      .pdf-qr-image {
        width: 200px;
        height: 200px;
        border-radius: 16px;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: white;
        padding: 8px;
      }
      .pdf-buttons-container {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: 2rem;
        flex-wrap: wrap;
      }
      .pdf-btn {
        padding: 12px 28px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.95rem;
        transition: all 0.2s ease;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex: 1;
        min-width: 160px;
      }
      .pdf-btn-download {
        background: #ffffff;
        color: #000000;
        box-shadow: 0 8px 20px rgba(255, 255, 255, 0.2);
        font-weight: 700;
      }
      .pdf-btn-download:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 28px rgba(255, 255, 255, 0.3);
        background: #f5f5f5;
      }
      .pdf-btn-download:active {
        transform: translateY(0);
      }
      .pdf-btn-view {
        background: rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }
      .pdf-btn-view:hover {
        background: rgba(255, 255, 255, 0.18);
        border-color: rgba(255, 255, 255, 0.25);
        transform: translateY(-2px);
      }
      .pdf-btn-view:active {
        transform: translateY(0);
      }
    </style>
    
    <button class="pdf-close-btn" onclick="document.getElementById('pdf-modal').remove(); window.showPDFModalDeclared = false;">×</button>
    
    <h2 class="pdf-title">Itinerary Ready! 🎉</h2>
    <p class="pdf-subtitle">Your Catanduanes adventure awaits. Scan the QR code or download your personalized itinerary.</p>
    
    <div class="pdf-qr-container">
      <img src="${data.qrCodeBase64}" alt="QR Code" class="pdf-qr-image" />
    </div>
    
    <div class="pdf-buttons-container">
      <a href="${data.pdfUrl}" target="_blank" download class="pdf-btn pdf-btn-download">
        ↓ Download Now
      </a>
      <a href="${data.pdfUrl}" target="_blank" class="pdf-btn pdf-btn-view">
        ◎ View Online
      </a>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      showPDFModalDeclared = false;
    }
  });
};

export const generatePDF = async (pdfData) => {
  try {
    console.log('📄 Sending to backend:', pdfData);
    const response = await api.post('/api/pdf/generate-public', pdfData);
    
    console.log('[PDF Response] Full response:', response.data);
    console.log('[PDF Response] pdfUrl:', response.data.pdfUrl);
    console.log('[PDF Response] success:', response.data.success);
    
    if (response.data.success) {
      // Validate response before showing modal
      if (!response.data.pdfUrl) {
        throw new Error('PDF URL is missing from response');
      }
      if (!response.data.qrCodeBase64) {
        throw new Error('QR Code is missing from response');
      }
      
      console.log('✅ PDF+QR generation successful');
      showPDFModal(response.data);
      return response.data;
    } else {
      throw new Error('Response success flag is false');
    }
  } catch (error) {
    console.error('❌ PDF+QR generation failed:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw new Error(error.response?.data?.detail || error.message || 'Failed to generate PDF+QR');
  }
};
