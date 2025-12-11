import { useRef, useEffect, useState } from 'react';
import { Menu, FileDown, ChevronRight, MapPin, Calendar, Hotel, UtensilsCrossed, Trees, Eye, Church, X, Send, Minus, MessageCircle } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as poiService from '../services/poiService';
import { generatePDF } from '../services/pdfService';
import aiService from '../services/aiService';
import styles from '../styles/ItineraryPage.module.css';

const MUNICIPALITIES = [
  'BAGAMANOC',
  'BARAS',
  'BATO',
  'CARAMORAN',
  'GIGMOTO',
  'PANDAN',
  'PANGANIBAN',
  'SAN ANDRES',
  'SAN MIGUEL',
  'VIGA',
  'VIRAC'
];

const CATEGORIES = [
  { id: 'hotels', label: 'Places to Stay', Icon: Hotel },
  { id: 'restaurants', label: 'Food & Drink', Icon: UtensilsCrossed },
  { id: 'falls', label: 'Nature', Icon: Trees },
  { id: 'viewpoints', label: 'Things to Do', Icon: Eye },
  { id: 'religious', label: 'Religious Sites', Icon: Church }
];

const ItineraryPage = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const [showCards, setShowCards] = useState(true);
  const [activeTab, setActiveTab] = useState('plan');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allPois, setAllPois] = useState([]);

  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState('itinerary');
  const [dragStartY, setDragStartY] = useState(0);
  const [currentSheetHeight, setCurrentSheetHeight] = useState(90);
  const sheetRef = useRef(null);
  const [showMobileOnboarding, setShowMobileOnboarding] = useState(true);
  const isMobile = window.innerWidth <= 768;

  const [startDate, setStartDate] = useState('2025-11-30');
  const [endDate, setEndDate] = useState('2025-12-02');
  const [showCalendar, setShowCalendar] = useState(false);
  const [budgetRange, setBudgetRange] = useState(5000);
  const [activity, setActivity] = useState('low');
  const [preferredActivities, setPreferredActivities] = useState(new Set());
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(1);
  const [seniors, setSeniors] = useState(1);

  const [expandedDays, setExpandedDays] = useState({});
  const [collapsingDays, setCollapsingDays] = useState({});
  const [dayItineraries, setDayItineraries] = useState({});
  const [selectedMunicipality, setSelectedMunicipality] = useState({});
  const [selectedCategories, setSelectedCategories] = useState({});
  const [availablePois, setAvailablePois] = useState({});
  const [userSelectedMunicipality, setUserSelectedMunicipality] = useState({});
  const [activeDayPoi, setActiveDayPoi] = useState(null);
  const [addedPoiIds, setAddedPoiIds] = useState(new Set());
  const [aiGeneratedDays, setAiGeneratedDays] = useState(null); // Track days from AI itinerary
  
  // AI Chat state
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', text: 'Hi! I\'m Pathfinder. Ask me anything about Catanduanes tourism or use me to help create your itinerary!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const calculateDays = () => {
    // If AI generated an itinerary, use that day count
    if (aiGeneratedDays !== null) {
      return aiGeneratedDays;
    }
    // Otherwise calculate from date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleDragStart = (e) => {
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
  };

  // Handle drag move
  const handleDragMove = (e) => {
    if (dragStartY === 0) return;
    
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY - clientY; // Positive = drag up, Negative = drag down
    const viewportHeight = window.innerHeight;
    
    // Calculate new height as percentage
    let newHeight = currentSheetHeight + (deltaY / viewportHeight) * 100;
    
    // Clamp between collapsed (15vh) and expanded (50vh)
    newHeight = Math.max(15, Math.min(50, newHeight));
    
    if (sheetRef.current) {
      sheetRef.current.style.height = `${newHeight}vh`;
    }
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    if (dragStartY === 0) return;
    
    const clientY = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;
    const deltaY = dragStartY - clientY;
    
    // Threshold: if dragged more than 50px, toggle state
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        // Dragged up - open
        setMobileSheetOpen(true);
        setCurrentSheetHeight(50);
      } else {
        // Dragged down - close
        setMobileSheetOpen(false);
        setCurrentSheetHeight(15);
      }
    } else {
      // Snap back to current state
      setCurrentSheetHeight(mobileSheetOpen ? 50 : 15);
    }
    
    setDragStartY(0);
  };

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const catanduanesCenter = [124.25, 13.75];
    const isMobile = window.innerWidth <= 768;
    const zoomLevel = isMobile ? 7.5 : 9;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/019ad40c-2183-7e4a-a4f4-fd0b017d00b0/style.json?key=AMdEDMTHduiJsTINtmZT',
      center: catanduanesCenter,
      zoom: zoomLevel,
      maxZoom: 18,
      minZoom: 7,
      attributionControl: false,
      preserveDrawingBuffer: false,
      refreshExpiredTiles: false,
    });

    map.current.on('load', () => {
      fetch('/data/CATANDUANES.geojson')
        .then(response => response.json())
        .then(data => {
          if (!map.current) return;

          map.current.addSource('catanduanes', {
            type: 'geojson',
            data: data
          });

          map.current.addLayer({
            id: 'catanduanes-outline',
            type: 'line',
            source: 'catanduanes',
            paint: {
              'line-color': '#ffffff',
              'line-width': 2
            }
          });
        })
        .catch(err => console.error('Failed to load Catanduanes GeoJSON:', err));
    });

    map.current.on('error', (e) => {
      console.error('Map error:', e);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const days = calculateDays();
    const newExpandedDays = {};
    const newSelectedMunicipality = {};
    const newSelectedCategories = {};
    const newUserSelectedMunicipality = {};

    // Only initialize on mount or when date range changes
    // Don't reset dayItineraries - that's managed separately by AI responses
    for (let i = 0; i < days; i++) {
      const dayKey = `day-${i}`;
      newExpandedDays[dayKey] = i === 0;
      newSelectedMunicipality[dayKey] = selectedMunicipality[dayKey] || '';
      newSelectedCategories[dayKey] = selectedCategories[dayKey] || [];
      newUserSelectedMunicipality[dayKey] = userSelectedMunicipality[dayKey] || false;
    }

    setExpandedDays(newExpandedDays);
    setSelectedMunicipality(newSelectedMunicipality);
    setSelectedCategories(newSelectedCategories);
    setUserSelectedMunicipality(newUserSelectedMunicipality);
    
    // Only reset dayItineraries on mount or when actual date values change, not on AI regeneration
    // This is determined by if we have no municipality selected yet
    if (Object.values(selectedMunicipality).every(m => !m)) {
      const newDayItineraries = {};
      for (let i = 0; i < days; i++) {
        newDayItineraries[`day-${i}`] = [];
      }
      setDayItineraries(newDayItineraries);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const loadPoisForDays = async () => {
      const newAvailablePois = {};

      for (const dayKey in selectedMunicipality) {
        const municipality = selectedMunicipality[dayKey];
        const categories = selectedCategories[dayKey] || [];
        const isUserSelected = userSelectedMunicipality[dayKey];

        // Only load POIs if municipality has been explicitly selected AND at least one category is selected
        if (!isUserSelected || !municipality || categories.length === 0) {
          newAvailablePois[dayKey] = [];
          continue;
        }

        try {
          const geojsonData = await poiService.loadMunicipalityData(municipality);
          let pois = poiService.getAllPOIs(geojsonData);

          pois = pois.filter(feature => {
            const poiCategory = poiService.featureToCarouselCard(feature, 0).category;
            return categories.includes(poiCategory);
          });

          newAvailablePois[dayKey] = pois.map((feature, index) =>
            poiService.featureToCarouselCard(feature, index)
          );
        } catch (error) {
          console.error(`Error loading POIs for ${dayKey}:`, error);
          newAvailablePois[dayKey] = [];
        }
      }

      setAvailablePois(newAvailablePois);
    };

    loadPoisForDays();
  }, [selectedMunicipality, selectedCategories, userSelectedMunicipality]);

  // Update map markers based on ITINERARY items only (not available POIs)
  useEffect(() => {
    if (!map.current) return;

    // Remove all existing markers
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current = [];

    // Get POIs ONLY from items actually added to the itinerary
    const itineraryPoiMarkersToAdd = [];
    for (const dayKey in dayItineraries) {
      const items = dayItineraries[dayKey] || [];
      itineraryPoiMarkersToAdd.push(...items);
    }

    // Remove duplicates by ID
    const uniqueItineraryPois = Array.from(
      new Map(itineraryPoiMarkersToAdd.map(poi => [poi.id, poi])).values()
    );

    console.log(`[MAP] Showing ${uniqueItineraryPois.length} itinerary items on map`);

    // Add markers ONLY for items in the itinerary
    uniqueItineraryPois.forEach(poi => {
      if (poi.coordinates) {
        const el = document.createElement('div');
        el.className = `${styles.marker}`;
        el.style.backgroundImage = 'url(/assets/beach_poi.svg)';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.backgroundSize = 'contain';
        el.style.cursor = 'pointer';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(poi.coordinates)
          .setPopup(
            new maplibregl.Popup({ offset: 25 })
              .setHTML(`
                <div style="padding: 8px; background: #ffffff; border-radius: 8px;">
                  <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #000000;">${poi.name}</h3>
                  <p style="margin: 0; font-size: 12px; color: #333333;">${poi.description || ''}</p>
                </div>
              `)
          )
          .addTo(map.current);
        
        markersRef.current.push(marker);
      }
    });
  }, [dayItineraries]);

  const handleContinue = () => {
    setShowCards(false);
  };

  const formatDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startMonth = start.toLocaleString('en-US', { month: 'short' });
    const endMonth = end.toLocaleString('en-US', { month: 'short' });
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
  };

  const getDayDate = (dayIndex) => {
    const start = new Date(startDate);
    const currentDay = new Date(start);
    currentDay.setDate(start.getDate() + dayIndex);
    const month = currentDay.toLocaleString('en-US', { month: 'short' });
    const day = currentDay.getDate();
    const dayName = currentDay.toLocaleString('en-US', { weekday: 'short' });
    return `${month} ${day}, ${dayName}`;
  };

  const toggleDay = (dayKey) => {
    const isCurrentlyExpanded = expandedDays[dayKey];
    
    if (isCurrentlyExpanded) {
      // Start collapse animation
      setCollapsingDays(prev => ({
        ...prev,
        [dayKey]: true
      }));
      
      // After animation completes, update expanded state
      setTimeout(() => {
        setExpandedDays(prev => ({
          ...prev,
          [dayKey]: false
        }));
        setCollapsingDays(prev => ({
          ...prev,
          [dayKey]: false
        }));
      }, 400);
    } else {
      // Expand
      setExpandedDays(prev => ({
        ...prev,
        [dayKey]: true
      }));
    }
  };

  const handleMunicipalityChange = (dayKey, municipality) => {
    setSelectedMunicipality(prev => ({
      ...prev,
      [dayKey]: municipality
    }));
    setUserSelectedMunicipality(prev => ({
      ...prev,
      [dayKey]: true
    }));

    // Pan camera to municipality
    if (map.current && municipality) {
      // Load the municipality GeoJSON and calculate center
      const normalizedMunicipality = municipality.replace(/ /g, '_');
      fetch(`/data/${normalizedMunicipality}.geojson`)
        .then(response => response.json())
        .then(data => {
          if (!data.features || data.features.length === 0) return;

          // Calculate bounding box from all features
          let minLng = Infinity, maxLng = -Infinity;
          let minLat = Infinity, maxLat = -Infinity;

          data.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
              const coords = feature.geometry.coordinates;
              if (feature.geometry.type === 'Point') {
                minLng = Math.min(minLng, coords[0]);
                maxLng = Math.max(maxLng, coords[0]);
                minLat = Math.min(minLat, coords[1]);
                maxLat = Math.max(maxLat, coords[1]);
              }
            }
          });

          if (minLng !== Infinity && maxLng !== -Infinity && minLat !== Infinity && maxLat !== -Infinity) {
            const centerLng = (minLng + maxLng) / 2;
            const centerLat = (minLat + maxLat) / 2;

            let zoomLevel = 11;
            if (municipality === 'CARAMORAN') {
              zoomLevel = 10;
            }

            map.current.flyTo({
              center: [centerLng, centerLat],
              zoom: zoomLevel,
              duration: 1000
            });
          }
        })
        .catch(err => console.error('Failed to calculate municipality center:', err));
    }
  };

  const toggleCategory = (dayKey, categoryId) => {
    setSelectedCategories(prev => {
      const currentCategories = prev[dayKey] || [];
      const newCategories = currentCategories.includes(categoryId)
        ? currentCategories.filter(id => id !== categoryId)
        : [...currentCategories, categoryId];

      return {
        ...prev,
        [dayKey]: newCategories
      };
    });
    
    // Set the active day POI when a category is selected
    if ((selectedCategories[dayKey] || []).length > 0 || (selectedCategories[dayKey] || []).length === 0) {
      setActiveDayPoi(dayKey);
    }
  };

  const addPoiToDay = (dayKey, poi) => {
    setDayItineraries(prev => {
      const currentItems = prev[dayKey] || [];
      if (currentItems.find(item => item.id === poi.id)) {
        return prev;
      }
      return {
        ...prev,
        [dayKey]: [...currentItems, poi]
      };
    });
    
    // Add to tracking set for animation
    setAddedPoiIds(prev => new Set([...prev, poi.id]));
    
    // Remove from tracking set after animation completes (600ms)
    setTimeout(() => {
      setAddedPoiIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(poi.id);
        return newSet;
      });
    }, 600);
  };

  const removePoiFromDay = (dayKey, poiId) => {
    setDayItineraries(prev => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter(item => item.id !== poiId)
    }));
  };

const handleChatSend = async () => {
  if (!chatInput.trim()) return;
  
  // Add user message
  const userMsg = chatInput;
  setChatMessages(prev => [...prev, { type: 'user', text: userMsg }]);
  setChatInput('');
  setChatLoading(true);
  
  try {
    // Check if user is asking for AI-generated itinerary
    // Multiple detection patterns for robustness
    const hasItineraryKeyword = /itinerary|trip|plan|schedule/i.test(userMsg);
    const hasActionKeyword = /create|generate|make|plan|build|prepare|design|suggest|want|need/i.test(userMsg);
    const daysMatch = userMsg.match(/(\d+)\s*-?(?:days?|day)/i); // Fixed: handle hyphens like "5-day"
    
    // Trigger itinerary generation if:
    // 1. Explicit itinerary request with action verb and days, OR
    // 2. Any mention of itinerary + days number
    const itineraryMatch = (hasItineraryKeyword && (hasActionKeyword || daysMatch)) || 
                          (hasItineraryKeyword && daysMatch);
    
    console.log('[CHAT] User message:', userMsg);
    console.log('[CHAT] hasItineraryKeyword:', hasItineraryKeyword);
    console.log('[CHAT] hasActionKeyword:', hasActionKeyword);
    console.log('[CHAT] daysMatch:', daysMatch ? daysMatch[1] + ' days' : null);
    console.log('[CHAT] itineraryMatch:', itineraryMatch);
    
    if (itineraryMatch && daysMatch) {
      console.log('[CHAT] ✅ DETECTED ITINERARY GENERATION REQUEST');
      
      // Extract number of days
      const numDays = parseInt(daysMatch[1]);
      const municipality = Object.values(selectedMunicipality)[0] || 'VIRAC';
      
      console.log('[CHAT] Generating itinerary:', { numDays, municipality, preferences: Array.from(preferredActivities), budget: budgetRange });
      
      // Add AI thinking message
      setChatMessages(prev => [...prev, { 
        type: 'ai', 
        text: `🎯 Generating a ${numDays}-day itinerary for ${municipality} with your preferences...` 
      }]);
      
      // Generate AI itinerary
      const itineraryResponse = await aiService.generateAIItinerary(
        municipality,
        Array.from(preferredActivities),
        numDays,
        budgetRange
      );
      
      console.log('[CHAT] Itinerary response:', itineraryResponse);
      
      if (itineraryResponse.itinerary) {
        // Auto-populate the itinerary from AI response
        // First, initialize structure for all days
        const newDayItineraries = {};
        const newSelectedMunicipalities = {};
        const newExpandedDays = {};
        const newSelectedCategories = {};
        const newUserSelectedMunicipality = {};
        
        // Initialize all days with empty structure
        for (let i = 0; i < numDays; i++) {
          newDayItineraries[`day-${i}`] = [];
          newSelectedMunicipalities[`day-${i}`] = '';
          newExpandedDays[`day-${i}`] = true;
          newSelectedCategories[`day-${i}`] = [];
          newUserSelectedMunicipality[`day-${i}`] = false;
        }
        
        console.log('[CHAT] Processing itinerary days...');
        
        // Now populate with AI response data
        Object.entries(itineraryResponse.itinerary).forEach(([dayKey, dayData]) => {
          const dayNum = dayData.day || parseInt(dayKey.split('_')[1]);
          const dayMapKey = `day-${dayNum - 1}`; // Convert to 0-based index (day 1 -> day-0)
          
          console.log(`[CHAT] Processing day ${dayNum}: ${dayData.places?.length || 0} places, mapped to key: ${dayMapKey}`);
          
          newDayItineraries[dayMapKey] = (dayData.places || []).map(place => ({
            id: place.name,
            name: place.name,
            description: place.type || 'Tourist attraction',
            category: place.category || place.type,
            coordinates: place.coordinates ? [place.coordinates.lng, place.coordinates.lat] : [124.25, 13.75]
          }));
          
          newSelectedMunicipalities[dayMapKey] = dayData.municipality || municipality;
          newExpandedDays[dayMapKey] = true; // Expand all days so user can see items
          newUserSelectedMunicipality[dayMapKey] = true; // Mark as user-selected (from AI)
          
          // Extract unique categories from places and auto-toggle them
          const placeCategories = new Set();
          (dayData.places || []).forEach(place => {
            if (place.category) {
              placeCategories.add(place.category);
            }
          });
          
          // Set the categories for this day so they appear in the filters
          newSelectedCategories[dayMapKey] = Array.from(placeCategories);
          console.log(`[CHAT] Day ${dayNum} categories: ${Array.from(placeCategories).join(', ')}`);
        });
        
        console.log('[CHAT] Final day itineraries:', newDayItineraries);
        console.log('[CHAT] Final selected categories:', newSelectedCategories);
        
        // Update state with AI-generated itinerary
        setDayItineraries(newDayItineraries);
        setSelectedMunicipality(newSelectedMunicipalities);
        setUserSelectedMunicipality(newUserSelectedMunicipality);
        setExpandedDays(newExpandedDays);
        setSelectedCategories(newSelectedCategories);
        setAiGeneratedDays(numDays); // Set the day count from AI
        
        // Add success message
        setChatMessages(prev => [...prev, { 
          type: 'ai', 
          text: `Perfect! I've created a personalized ${numDays}-day itinerary for ${municipality}! 🗺️\n\n${itineraryResponse.ai_recommendation || 'Your itinerary has been generated and is ready to explore.'}\n\nYou can now view and modify your itinerary in the Itinerary tab.` 
        }]);
        
        console.log('[CHAT] Itinerary generated successfully, switching to itinerary tab');
        
        // Switch to itinerary view
        setActiveTab('itinerary');
      } else {
        throw new Error('No itinerary data received');
      }
    } else {
      console.log('[CHAT] Regular chat message, not an itinerary request');
      
      // Regular chat interaction
      const response = await aiService.chatWithAI(
        userMsg,
        Array.from(preferredActivities),
        Object.values(selectedMunicipality)[0] || null
      );
      
      console.log('[CHAT] AI response:', response);
      
      // Add AI response
      setChatMessages(prev => [...prev, { type: 'ai', text: response.answer }]);
      
      // Check if user asked "Where" or "Tell me more" - if so, zoom to the place
      const isWhereQuery = /^(where|tell me more|show me|what is|where is|where can|can you show)/i.test(userMsg.trim());
      
      // If places are returned, add them to available POIs and zoom to the first one
      if (response.places && response.places.length > 0) {
        const placesToAdd = response.places.map((place) => ({
          id: place.name,
          name: place.name,
          description: place.type || 'Tourist attraction',
          category: place.type,
          coordinates: [place.lng, place.lat]
        }));
        
        // Add to current day POIs if a day is active
        if (activeDayPoi) {
          setAvailablePois(prev => ({
            ...prev,
            [activeDayPoi]: placesToAdd
          }));
        }
        
        // If "Where" query, zoom the map to the first place
        if (isWhereQuery && map.current && placesToAdd[0]) {
          const coords = placesToAdd[0].coordinates;
          map.current.flyTo({
            center: coords,
            zoom: 14,
            duration: 1000
          });
          console.log('[CHAT] Zooming map to:', placesToAdd[0].name, coords);
        }
      }
    }
  } catch (error) {
    console.error('[CHAT] Error:', error);
    setChatMessages(prev => [...prev, { 
      type: 'ai', 
      text: `Sorry, I encountered an error: ${error.message}` 
    }]);
  } finally {
    setChatLoading(false);
  }
};

const handleKeyPress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleChatSend();
  }
};

const handleExportPDF = async () => {
  try {
    // Helper to parse ISO date string without timezone issues
    const parseISODate = (dateString) => {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    // Format data for backend
    const days = Object.keys(dayItineraries).map((dayKey, index) => {
      const dayIndex = parseInt(dayKey.split('-')[1]);
      
      // Format date properly (e.g., "Dec 27, Sat")
      const actualDate = parseISODate(startDate);
      actualDate.setDate(actualDate.getDate() + dayIndex);
      
      const formattedDate = actualDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
      });
      
      return {
        day: index + 1,
        date: formattedDate,
        municipality: selectedMunicipality[dayKey] || '',
        items: dayItineraries[dayKey].map(item => ({
          name: item.name,
          description: item.description || ''
        }))
      };
    });

    const startDateObj = parseISODate(startDate);
    const endDateObj = parseISODate(endDate);

    const pdfData = {
      start_date: startDateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      end_date: endDateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      budget: budgetRange,
      days: days,
      adults: adults,
      children: children,
      seniors: seniors
    };

    console.log('📤 Sending PDF data:', JSON.stringify(pdfData, null, 2));

    await generatePDF(pdfData);
    alert('PDF downloaded successfully!');
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert(error.message || 'Failed to export itinerary as PDF. Please try again.');
  }
};


  const renderDaySection = (dayIndex) => {
    const dayKey = `day-${dayIndex}`;
    const isExpanded = expandedDays[dayKey];
    const municipality = selectedMunicipality[dayKey];
    const categories = selectedCategories[dayKey] || [];
    const itineraryItems = dayItineraries[dayKey] || [];
    const pois = availablePois[dayKey] || [];

    return (
      <div key={dayKey} className={styles.daySection}>
        <div className={styles.dayHeader} onClick={() => toggleDay(dayKey)}>
          <div className={styles.dayHeaderLeft}>
            <ChevronRight
              size={16}
              className={`${styles.chevronIcon} ${isExpanded ? styles.chevronExpanded : ''}`}
              strokeWidth={2}
            />
            <span className={styles.dayTitle}>Day {dayIndex + 1}</span>
            <span className={styles.dayDate}>{getDayDate(dayIndex)}</span>
            <div className={styles.municipalitySection} onClick={(e) => e.stopPropagation()}>
              <MapPin size={16} className={styles.locationIcon} strokeWidth={2} />
              <select
                className={styles.municipalitySelect}
                value={municipality}
                onChange={(e) => {
                  e.stopPropagation();
                  handleMunicipalityChange(dayKey, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select municipality</option>
                {MUNICIPALITIES.map(muni => (
                  <option key={muni} value={muni}>
                    {muni.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {(isExpanded || collapsingDays[dayKey]) && (
          <div className={`${styles.dayContent} ${collapsingDays[dayKey] ? styles.dayContentCollapsing : ''}`}>
            <div className={styles.verticalLine}></div>

            <div className={styles.dayInstructions}>
              Add items from the list below to your travel itinerary.
            </div>

            <div className={styles.categoryPills}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`${styles.categoryPill} ${categories.includes(cat.id) ? styles.categoryPillActive : ''}`}
                  onClick={() => toggleCategory(dayKey, cat.id)}
                >
                  <cat.Icon size={16} strokeWidth={2} />
                  {cat.label}
                </button>
              ))}
            </div>

            {itineraryItems.length > 0 && (
              <div className={styles.dayItineraryList}>
                {itineraryItems.map((item, index) => (
                  <div key={item.id} className={styles.dayItineraryItem}>
                    <div className={styles.itemNumber}>{index + 1}</div>
                    <div className={styles.itemInfo}>
                      <h4 className={styles.itemName}>{item.name}</h4>
                      <p className={styles.itemDesc}>{item.description}</p>
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removePoiFromDay(dayKey, item.id)}
                    >
                      <X size={18} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.itineraryPage}>
      {showCalendar && (
        <div className={styles.calendarOverlay} onClick={() => setShowCalendar(false)}>
          <div className={styles.calendarModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.calendarTitle}>Select Journey Dates</h3>
            <div className={styles.dateInputGroup}>
              <label className={styles.dateLabel}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.dateInputGroup}>
              <label className={styles.dateLabel}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <button className={styles.calendarDoneBtn} onClick={() => setShowCalendar(false)}>
              Done
            </button>
          </div>
        </div>
      )}
      <div className={styles.itineraryContent}>
        {showCards ? (
          <div className={styles.cardsSection}>
            <div className={styles.cardsGrid}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Journey dates</h3>
                <div className={styles.cardContent}>
                  <div className={styles.dateBox} onClick={() => setShowCalendar(true)}>
                    <Calendar size={20} className={styles.calendarIcon} strokeWidth={2} />
                    <span className={styles.dateText}>{formatDateRange()}</span>
                  </div>
                  <p className={styles.cardNote}>Allowed period is from 1 to 3 days ({calculateDays()} days selected)</p>
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Budget</h3>
                <div className={styles.cardContent}>
                  <div className={styles.budgetSliderContainer}>
                    <input
                      type="range"
                      min="1000"
                      max="50000"
                      step="500"
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(parseInt(e.target.value))}
                      className={styles.budgetSlider}
                    />
                    <div className={styles.budgetDisplayContainer}>
                      <span className={styles.budgetMin}>₱1,000</span>
                      <span className={styles.budgetDisplay}>₱{budgetRange.toLocaleString()}</span>
                      <span className={styles.budgetMax}>₱50,000</span>
                    </div>
                  </div>
                  <p className={styles.cardNote}>Price range for your trip</p>
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Reviews</h3>
                <div className={styles.cardContent}>
                  <p className={styles.reviewsText}>Visitors here consistently describe their experiences as joyful, a testament to the warmth of the locals despite the challenges of nature.</p>
                  <p className={styles.cardNote}>Traveler experiences and testimonials</p>
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>What would you like to do?</h3>
                <div className={styles.cardContent}>
                  <div className={styles.activitiesGrid}>
                    {['Swimming', 'Hiking', 'Sightseeing', 'Waterfalls', 'Historical'].map((act) => (
                      <label key={act} className={styles.activityCheckbox}>
                        <input
                          type="checkbox"
                          checked={preferredActivities.has(act)}
                          onChange={(e) => {
                            const newActivities = new Set(preferredActivities);
                            if (e.target.checked) {
                              newActivities.add(act);
                            } else {
                              newActivities.delete(act);
                            }
                            setPreferredActivities(newActivities);
                          }}
                          className={styles.activityCheckboxInput}
                        />
                        <span className={styles.activityLabel}>{act}</span>
                      </label>
                    ))}
                  </div>
                  <p className={styles.cardNote}>Select your preferred activities</p>
                </div>
              </div>
            </div>
            <button className={styles.continueBtn} onClick={handleContinue}>
              Continue
            </button>
          </div>
        ) : (
          <div className={styles.mainLayout}>
<button 
  className={styles.mapIconBtn} 
  onClick={() => setSidebarOpen(!sidebarOpen)}
  title="View Itinerary"
>
  <Menu size={20} strokeWidth={2} />
</button>
            <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
              <div className={styles.sidebarContent}>
                <div className={styles.sidebarHeader}>
                  <h2 className={styles.sidebarTitle}>Itinerary</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className={styles.exportBtn}
                      onClick={handleExportPDF}
                      title="Download PDF"
                    >
                      <FileDown size={20} strokeWidth={2} />
                    </button>
                    <button 
                      className={styles.sidebarCloseBtn}
                      onClick={() => setSidebarOpen(false)}
                      title="Close sidebar"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className={styles.itineraryScrollContainer}>
                  {Array.from({ length: calculateDays() }, (_, i) => renderDaySection(i))}
                </div>
              </div>
            </div>

            <div className={styles.mainContentContainer}>
              <div className={styles.chatContainer}>
                <div className={styles.chatTab}>
                  <h3 className={styles.chatHeading}>Where will you go today?</h3>
                  <div className={styles.chatMessages}>
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`${styles.chatMessage} ${styles[msg.type]}`}>
                        <p className={styles.chatMessageText}>{msg.text}</p>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className={`${styles.chatMessage} ${styles.ai}`}>
                        <p className={styles.chatMessageText}>Pathfinder is thinking...</p>
                      </div>
                    )}
                  </div>
                  <div className={styles.chatInputContainer}>
                    <input 
                      type="text" 
                      placeholder="Ask about your trip..." 
                      className={styles.chatInput}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={chatLoading}
                    />
                    <button 
                      className={styles.chatSendBtn}
                      onClick={handleChatSend}
                      disabled={chatLoading || !chatInput.trim()}
                      title="Send message"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating POI Card beside sidebar */}
{activeDayPoi && availablePois[activeDayPoi]?.length > 0 && (
  <div className={`${styles.poiCardContainer} ${activeDayPoi ? styles.poiCardContainerOpen : ''}`}>
    <div className={styles.poiCard}>
      <div className={styles.poiCardHeader}>
        <h3 className={styles.poiCardTitle}>Nearby Attractions</h3>
        <button
          className={styles.poiCardCloseBtn}
          onClick={() => setActiveDayPoi(null)}
          aria-label="Close"
        >
          ×
        </button>
      </div>
                    <div className={styles.poiCardList}>
                      {availablePois[activeDayPoi]
                        .filter(poi => {
                          const itineraryItems = dayItineraries[activeDayPoi] || [];
                          return !itineraryItems.find(item => item.id === poi.id);
                        })
                        .map((poi) => (
                        <div key={poi.id} className={`${styles.availablePoiItem} ${addedPoiIds.has(poi.id) ? styles.poiItemSlideOut : ''}`}>
                          <div className={styles.poiInfo}>
                            <h4 className={styles.poiName}>{poi.name}</h4>
                            <p className={styles.poiDesc}>{poi.description}</p>
                          </div>
                          <button
                            className={styles.addPoiBtn}
                            onClick={() => addPoiToDay(activeDayPoi, poi)}
                            disabled={addedPoiIds.has(poi.id)}
                          >
                            {addedPoiIds.has(poi.id) ? '✓' : '+ Add'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.mapWrapper}>
          <div className={styles.mapOverlayBox}>
            <div ref={mapContainer} className={styles.mapContainer} />
          </div>
        </div>
      </div>
      <div className={styles.overlayRectangle} />

      {/* MOBILE ONBOARDING OVERLAY - Shows on first load */}
      {showMobileOnboarding && (
        <div className={styles.mobileOnboardingOverlay}>
          <div className={styles.mobileOnboardingContent}>
            {/* Header */}
            <div className={styles.onboardingHeader}>
              <h2>Plan Your Trip</h2>
              <button 
                className={styles.onboardingCloseBtn}
                onClick={() => setShowMobileOnboarding(false)}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className={styles.onboardingScroll}>
              {/* Travel Dates Card */}
              <div className={styles.onboardingCard}>
                <h3>Travel Dates</h3>
                <div className={styles.dateDisplay}>
                  <Calendar size={20} />
                  <span>{formatDateRange()}</span>
                </div>
                <button 
                  className={styles.editDateBtn}
                  onClick={() => setShowCalendar(true)}
                >
                  Edit Dates
                </button>
              </div>

              {/* Budget Range Card */}
              <div className={styles.onboardingCard}>
                <h3>Budget Range</h3>
                <div className={styles.budgetDisplay}>
                  ₱{budgetRange.toLocaleString()}
                </div>
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="500"
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(Number(e.target.value))}
                  className={styles.budgetSlider}
                />
              </div>

              {/* What would you like to do? */}
              <div className={styles.onboardingCard}>
                <h3>What would you like to do?</h3>
                <div className={styles.categoryPills}>
                  {[
                    { key: 'places_to_stay', label: 'Places to Stay' },
                    { key: 'food_and_drink', label: 'Food & Drink' },
                    { key: 'nature', label: 'Nature' },
                    { key: 'things_to_do', label: 'Things to Do' },
                    { key: 'religious_sites', label: 'Religious Sites' },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      className={`${styles.categoryPill} ${
                        selectedCategories['mobile']?.includes(cat.key)
                          ? styles.categoryPillActive
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedCategories((prev) => {
                          const current = new Set(prev['mobile'] || []);
                          if (current.has(cat.key)) {
                            current.delete(cat.key);
                          } else {
                            current.add(cat.key);
                          }
                          return { ...prev, mobile: Array.from(current) };
                        });
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <button 
              className={styles.onboardingContinueBtn}
              onClick={() => setShowMobileOnboarding(false)}
            >
              Continue to Map
            </button>
          </div>
        </div>
      )}



      <div className={`${styles.mobileSheet} ${mobileSheetOpen ? styles.sheetOpen : ''}`}>
        {/* DRAG HANDLE + BUTTONS - Part of the sheet, not overlay */}
        <div className={styles.sheetHeader}>
          {/* Drag handle indicator */}
          <div 
            className={styles.dragHandle}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onMouseMove={handleDragMove}
            onTouchMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onTouchEnd={handleDragEnd}
            onMouseLeave={handleDragEnd}
          ></div>
          
          {/* Button container */}
          <div className={styles.mobileBottomBar}>
            <button 
              className={`${styles.mobileBarBtn} ${mobileActiveTab === 'itinerary' ? styles.active : ''}`}
              onClick={() => {
                setMobileSheetOpen(true);
                setMobileActiveTab('itinerary');
              }}
            >
              <Calendar size={20} />
              <span>Itinerary</span>
            </button>
            
            <button 
              className={`${styles.mobileBarBtn} ${mobileActiveTab === 'chat' ? styles.active : ''}`}
              onClick={() => {
                setMobileSheetOpen(true);
                setMobileActiveTab('chat');
              }}
            >
              <MessageCircle size={20} />
              <span>Chat AI</span>
            </button>
          </div>
        </div>

        {/* CONTENT AREA - Scrolls below the buttons */}
        <div className={styles.sheetContent} ref={sheetRef}>
          {mobileActiveTab === 'itinerary' && (
            <div className={styles.mobileItineraryContent}>
              <div className={styles.mobileItineraryHeader}>
                <h3 className={styles.mobileItineraryTitle}>Your Itinerary</h3>
                <button
                  className={styles.mobileExportBtn}
                  onClick={handleExportPDF}
                  title="Export as PDF"
                >
                  <FileDown size={18} strokeWidth={2} />
                </button>
              </div>

              <div>
                {Array.from({ length: calculateDays() }, (_, i) => renderDaySection(i))}
              </div>
            </div>
          )}  

          {mobileActiveTab === 'chat' && (
            <div className={styles.mobileChatContent}>
              <h3 style={{color:'white', margin:'0 0 16px', fontSize:'18px', fontWeight:'600'}}>Chat Assistant</h3>
              <div className={styles.chatMessages} style={{minHeight: '200px', marginBottom: '16px'}}>
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`${styles.chatMessage} ${styles[msg.type]}`}>
                    <p className={styles.chatMessageText}>{msg.text}</p>
                  </div>
                ))}
                {chatLoading && (
                  <div className={`${styles.chatMessage} ${styles.ai}`}>
                    <p className={styles.chatMessageText}>Pathfinder is thinking...</p>
                  </div>
                )}
              </div>
              <div className={styles.chatInputContainer}>
                <input 
                  type="text" 
                  placeholder="Type your message..." 
                  className={styles.chatInput}
                  style={{flex:1, background:'transparent', border:'none', color:'white', outline:'none'}}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={chatLoading}
                />
                <button 
                  className={styles.chatSendBtn} 
                  style={{background:'transparent', border:'none', color:'white', cursor:'pointer'}}
                  onClick={handleChatSend}
                  disabled={chatLoading || !chatInput.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ItineraryPage;