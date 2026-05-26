"use client";
import { useEffect, useState } from "react";
import { CloudSun, Droplets, Wind, Thermometer, CloudRain, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function WeatherIcon({ icon, className }: { icon: string; className?: string }) {
  return (
    <img
      src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
      alt="weather"
      className={className || "w-12 h-12"}
    />
  );
}

function RainAlert({ pop }: { pop: number }) {
  if (pop < 40) return null;
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${pop >= 70 ? "bg-red-50 text-red-700 border border-red-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>
        {pop >= 70
          ? `Alta chance de chuva (${pop}%) — considere avisar clientes e preparar cobertura.`
          : `Chance de chuva (${pop}%) — mantenha atenção ao clima.`}
      </span>
    </div>
  );
}

export default function PrevisaoPage() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/previsao")
      .then((r) => { if (!r.ok) throw new Error("Indisponível"); return r.json(); })
      .then(setWeather)
      .catch(() => setError("Previsão do tempo indisponível. Configure a chave da OpenWeather API."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-muted-foreground">Carregando previsão...</div>;

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <CloudSun className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Previsão do Tempo</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <CloudRain className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">Configure OPENWEATHER_API_KEY no arquivo .env</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todayPop = weather.forecast[0]?.pop || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CloudSun className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Previsão do Tempo</h1>
        <Badge variant="outline">{weather.cityName}</Badge>
      </div>

      <RainAlert pop={todayPop} />

      {/* Agora */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Agora em {weather.cityName}</p>
              <div className="flex items-end gap-2">
                <p className="text-6xl font-bold">{weather.temp}°</p>
                <p className="text-lg text-muted-foreground mb-2">C</p>
              </div>
              <p className="text-muted-foreground capitalize">{weather.description}</p>
            </div>
            <WeatherIcon icon={weather.icon} className="w-20 h-20" />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <div>
                <p className="text-xs text-muted-foreground">Sensação</p>
                <p className="font-semibold">{weather.feelsLike}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-xs text-muted-foreground">Umidade</p>
                <p className="font-semibold">{weather.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-muted-foreground">Vento</p>
                <p className="font-semibold">{weather.windSpeed} km/h</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previsão 5 dias */}
      <Card>
        <CardHeader><CardTitle className="text-base">Próximos 5 dias</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weather.forecast.map((day: any) => (
              <div key={day.date} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="w-28">
                  <p className="font-medium text-sm capitalize">
                    {format(parseISO(day.date), "EEEE", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(day.date), "dd/MM")}</p>
                </div>
                <WeatherIcon icon={day.icon} className="w-10 h-10" />
                <div className="text-center">
                  <p className="text-xs capitalize text-muted-foreground max-w-[100px] truncate">{day.description}</p>
                  {day.pop > 20 && (
                    <p className={`text-xs font-medium flex items-center gap-1 justify-center ${day.pop >= 60 ? "text-blue-600" : "text-blue-400"}`}>
                      <Droplets className="w-3 h-3" />{day.pop}%
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{day.tempMax}°</p>
                  <p className="text-muted-foreground text-xs">{day.tempMin}°</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">💡 Dicas para o lava-jato</p>
          <ul className="text-xs text-blue-700 space-y-1">
            {todayPop >= 70 && <li>• Chuva prevista — informe clientes que a lavagem pode perder efeito</li>}
            {todayPop >= 40 && todayPop < 70 && <li>• Possibilidade de chuva — considere oferecer retoque gratuito</li>}
            {todayPop < 40 && <li>• Dia favorável para lavagem completa e polimento</li>}
            {weather.temp > 30 && <li>• Alta temperatura — evite lavar carro ao sol direto</li>}
            {weather.windSpeed > 30 && <li>• Vento forte — poeira acumulará rapidamente no veículo</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
