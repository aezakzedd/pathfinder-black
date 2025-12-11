import api from './api';

export const aiService = {
  /**
   * Chat with Pathfinder AI
   * @param {string} message - User message
   * @param {string[]} preferences - User preferences (e.g., ["Swimming", "Hiking"])
   * @param {string} municipality - Selected municipality
   * @returns {Promise} AI response with places and recommendations
   */
  async chatWithAI(message, preferences = [], municipality = null) {
    try {
      const response = await api.post('/api/ai/chat', {
        message,
        preferences,
        municipality
      });
      return response.data;
    } catch (error) {
      console.error('AI chat error:', error);
      throw new Error(error.response?.data?.detail || 'AI chat failed');
    }
  },

  /**
   * Generate AI-powered itinerary
   * @param {string} municipality - Municipality name
   * @param {string[]} preferences - User activity preferences
   * @param {number} days - Number of days
   * @param {number} budget - Budget in PHP
   * @returns {Promise} Generated itinerary
   */
  async generateAIItinerary(municipality, preferences, days, budget) {
    try {
      const response = await api.post('/api/ai/generate-itinerary', {
        municipality,
        preferences,
        days,
        budget
      });
      return response.data;
    } catch (error) {
      console.error('Itinerary generation error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to generate itinerary');
    }
  },

  /**
   * Get detailed information about a place
   * @param {string} placeName - Name of the place
   * @returns {Promise} Place details with coordinates
   */
  async getPlaceDetails(placeName) {
    try {
      const response = await api.post('/api/ai/place-details', null, {
        params: { place_name: placeName }
      });
      return response.data;
    } catch (error) {
      console.error('Place details error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to get place details');
    }
  },

  /**
   * Get available activity preferences
   * @returns {Promise} List of available preferences
   */
  async getActivityPreferences() {
    try {
      const response = await api.get('/api/ai/preferences');
      return response.data;
    } catch (error) {
      console.error('Preferences error:', error);
      throw new Error('Failed to get preferences');
    }
  },

  /**
   * Get available municipalities
   * @returns {Promise} List of municipalities
   */
  async getAvailableMunicipalities() {
    try {
      const response = await api.get('/api/ai/municipalities');
      return response.data;
    } catch (error) {
      console.error('Municipalities error:', error);
      throw new Error('Failed to get municipalities');
    }
  },

  /**
   * Check AI service health
   * @returns {Promise} Health status
   */
  async checkHealth() {
    try {
      const response = await api.get('/api/ai/health');
      return response.data;
    } catch (error) {
      console.error('Health check error:', error);
      throw new Error('AI service unavailable');
    }
  },

  /**
   * Process user preferences and generate personalized recommendations
   * @param {string[]} preferences - User selected preferences
   * @param {string} municipality - Selected municipality
   * @returns {Promise} Prioritized recommendations
   */
  async getPreferencedRecommendations(preferences, municipality) {
    try {
      const query = `Best places for ${preferences.join(', ')} in ${municipality}`;
      const response = await this.chatWithAI(query, preferences, municipality);
      
      // Sort places by relevance to preferences
      if (response.places && response.places.length > 0) {
        response.places.sort((a, b) => {
          const aMatch = preferences.some(p => a.type?.includes(p.toLowerCase()));
          const bMatch = preferences.some(p => b.type?.includes(p.toLowerCase()));
          return bMatch - aMatch;
        });
      }
      
      return response;
    } catch (error) {
      console.error('Recommendations error:', error);
      throw error;
    }
  }
};

export default aiService;
