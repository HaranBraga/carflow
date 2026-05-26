import axios from "axios";

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  cityName: string;
  forecast: ForecastItem[];
}

export interface ForecastItem {
  date: string;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
  pop: number; // probability of precipitation
}

export async function getCurrentWeather(): Promise<WeatherData | null> {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const lat = process.env.OPENWEATHER_LAT || "-23.5505";
    const lon = process.env.OPENWEATHER_LON || "-46.6333";

    const [currentRes, forecastRes] = await Promise.all([
      axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br`),
      axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br&cnt=32`),
    ]);

    const current = currentRes.data;
    const forecast = processForecast(forecastRes.data.list);

    return {
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      humidity: current.main.humidity,
      description: current.weather[0].description,
      icon: current.weather[0].icon,
      windSpeed: Math.round(current.wind.speed * 3.6),
      cityName: current.name,
      forecast,
    };
  } catch (error) {
    console.error("Erro ao buscar previsão do tempo:", error);
    return null;
  }
}

function processForecast(list: any[]): ForecastItem[] {
  const byDay: Record<string, any[]> = {};

  list.forEach((item) => {
    const date = item.dt_txt.split(" ")[0];
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(item);
  });

  return Object.entries(byDay)
    .slice(0, 5)
    .map(([date, items]) => {
      const temps = items.map((i) => i.main.temp);
      const midDay = items.find((i) => i.dt_txt.includes("12:00")) || items[Math.floor(items.length / 2)];
      return {
        date,
        tempMin: Math.round(Math.min(...temps)),
        tempMax: Math.round(Math.max(...temps)),
        description: midDay.weather[0].description,
        icon: midDay.weather[0].icon,
        pop: Math.round(Math.max(...items.map((i) => i.pop)) * 100),
      };
    });
}
