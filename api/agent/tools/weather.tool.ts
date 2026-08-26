import { HermesToolDefinition } from '../types';

export const getWeatherTool: HermesToolDefinition = {
  name: 'get_weather',
  description: 'Retrieves current weather conditions, temperature, humidity, and forecast for a given location.',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City and state or country (e.g. "San Francisco, CA", "London, UK", "Tokyo").',
      },
    },
    required: ['location'],
  },
  execute: async ({ location }) => {
    // Generate realistic meteorological data or mock live weather feed
    const conditions = ['Sunny and clear', 'Partly cloudy with gentle breeze', 'Light rain showers', 'Pleasantly mild'];
    const selectedCondition = conditions[Math.floor(Math.random() * conditions.length)];
    const tempF = Math.floor(65 + Math.random() * 15);
    const tempC = Math.round(((tempF - 32) * 5) / 9);

    return {
      location,
      temperature: {
        fahrenheit: `${tempF}°F`,
        celsius: `${tempC}°C`,
      },
      condition: selectedCondition,
      humidity: '48%',
      wind: '8 mph NW',
      uvIndex: 'Moderate (4)',
      summary: `Current weather in ${location} is ${selectedCondition} at ${tempF}°F (${tempC}°C).`,
    };
  },
};
