"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Car, User, CheckCircle, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_CATEGORY_LABELS, CHECKLIST_AREAS, formatPhone, formatCurrency } from "@/lib/utils";

type Step = "placa" | "cliente" | "servicos" | "checklist" | "confirmacao";

interface CustomerData {
  id?: string;
  name: string;
  phone: string;
  gender: string;
  isUber: boolean;
}

interface VehicleData {
  id?: string;
  plate: string;
  model: string;
  brand: string;
  color: string;
  category: string;
  customerId?: string;
}

interface ServiceItem {
  serviceId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
}

interface ChecklistEntry {
  area: string;
  hasIssue: boolean;
  notes: string;
}

export default function EntradaPage() {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [step, setStep] = useState<Step>("placa");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [plateInput, setPlateInput] = useState("");
  const [existingVehicle, setExistingVehicle] = useState<any>(null);

  const [customer, setCustomer] = useState<CustomerData>({ name: "", phone: "", gender: "NOT_INFORMED", isUber: false });
  const [vehicle, setVehicle] = useState<VehicleData>({ plate: "", model: "", brand: "", color: "", category: "POPULAR" });
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<ChecklistEntry[]>(
    CHECKLIST_AREAS.map((area) => ({ area, hasIssue: false, notes: "" }))
  );
  const [opportunities, setOpportunities] = useState<string[]>([]);
  const [washerId, setWasherId] = useState("");
  const [washers, setWashers] = useState<any[]>([]);
  const [orderNotes, setOrderNotes] = useState("");

  async function searchPlate() {
    if (plateInput.length < 7) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/veiculos?plate=${plateInput}`);
      const data = await res.json();
      if (data) {
        setExistingVehicle(data);
        setVehicle({ ...data });
        setCustomer({ id: data.customer.id, name: data.customer.name, phone: data.customer.phone, gender: data.customer.gender, isUber: data.customer.isUber });
      } else {
        setExistingVehicle(null);
        setVehicle((v) => ({ ...v, plate: plateInput.toUpperCase() }));
      }
    } finally {
      setSearching(false);
    }
  }

  async function loadServicesAndWashers() {
    const [svcRes, wRes] = await Promise.all([
      fetch("/api/servicos"),
      fetch("/api/lavadores"),
    ]);
    setAvailableServices(await svcRes.json());
    setWashers(await wRes.json());
  }

  function goToStep(s: Step) {
    if (s === "servicos") loadServicesAndWashers();
    setStep(s);
  }

  function addService(svc: any) {
    if (services.find((s) => s.serviceId === svc.id)) return;
    setServices([...services, { serviceId: svc.id, name: svc.name, unitPrice: Number(svc.basePrice), quantity: 1, discount: 0 }]);
  }

  function removeService(serviceId: string) {
    setServices(services.filter((s) => s.serviceId !== serviceId));
  }

  function addOpportunity(serviceId: string) {
    if (!serviceId || opportunities.includes(serviceId)) return;
    setOpportunities([...opportunities, serviceId]);
  }

  function removeOpportunity(serviceId: string) {
    setOpportunities(opportunities.filter((s) => s !== serviceId));
  }

  const total = services.reduce((sum, s) => sum + s.unitPrice * s.quantity - s.discount, 0);

  const opportunityServices = opportunities
    .map((sid) => availableServices.find((s) => s.id === sid))
    .filter(Boolean);

  async function submitOrder() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      let customerId = customer.id;
      let vehicleId = existingVehicle?.id;

      if (!customerId) {
        const cRes = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: customer.name,
            phone: customer.phone,
            gender: customer.gender,
            isUber: customer.isUber,
          }),
        });
        if (!cRes.ok) {
          const e = await cRes.json().catch(() => ({}));
          throw new Error(e.error || "Falha ao cadastrar cliente");
        }
        const cData = await cRes.json();
        customerId = cData.id;
        setCustomer((c) => ({ ...c, id: customerId }));
      }

      if (!vehicleId) {
        const vRes = await fetch("/api/veiculos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...vehicle, customerId }),
        });
        const vData = await vRes.json();
        if (!vRes.ok) {
          if (vRes.status === 409 && vData.vehicle?.id) {
            vehicleId = vData.vehicle.id;
            setExistingVehicle(vData.vehicle);
          } else {
            throw new Error(vData.error || "Falha ao cadastrar veículo");
          }
        } else {
          vehicleId = vData.id;
          setExistingVehicle(vData);
        }
      }

      const opportunitiesPayload = opportunities
        .map((sid) => {
          const svc = availableServices.find((s) => s.id === sid);
          if (!svc) return null;
          return { description: svc.name, estimatedValue: Number(svc.basePrice) };
        })
        .filter(Boolean);

      const oRes = await fetch("/api/ordens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          washerId: washerId || undefined,
          notes: orderNotes,
          services: services.map((s) => ({
            serviceId: s.serviceId,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
            discount: s.discount,
          })),
          checklist: checklist.filter((c) => c.hasIssue),
          opportunities: opportunitiesPayload,
        }),
      });

      if (!oRes.ok) {
        const e = await oRes.json().catch(() => ({}));
        throw new Error(e.error || `Falha ao criar ordem (${oRes.status})`);
      }

      router.push("/lavagem");
    } catch (e: any) {
      setError(e?.message || "Erro ao registrar entrada");
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Car className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Entrada de Veículo</h1>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1">
        {[
          { key: "placa", label: "Placa" },
          { key: "cliente", label: "Cliente" },
          { key: "servicos", label: "Serviços" },
          { key: "checklist", label: "Checklist" },
          { key: "confirmacao", label: "Confirmar" },
        ].map(({ key, label }, i, arr) => (
          <div key={key} className="flex items-center gap-2 shrink-0">
            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
            <span className={step === key ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
            {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
      </div>

      {/* STEP 1: PLACA */}
      {step === "placa" && (
        <Card>
          <CardHeader><CardTitle>Buscar ou Cadastrar Veículo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="ABC-1234 ou ABC1D23"
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && searchPlate()}
                className="text-lg font-mono uppercase tracking-widest"
                maxLength={8}
              />
              <Button onClick={searchPlate} disabled={searching}>
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {existingVehicle && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-1">
                <p className="font-semibold text-green-800">Veículo encontrado!</p>
                <p className="text-sm">{existingVehicle.brand} {existingVehicle.model} — {VEHICLE_CATEGORY_LABELS[existingVehicle.category]}</p>
                <p className="text-sm text-muted-foreground">Cliente: {existingVehicle.customer?.name} · {formatPhone(existingVehicle.customer?.phone || "")}</p>
              </div>
            )}

            {!existingVehicle && plateInput.length >= 7 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Novo veículo. Preencha os dados:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Placa</Label>
                    <Input value={vehicle.plate || plateInput} readOnly className="font-mono uppercase" />
                  </div>
                  <div>
                    <Label>Categoria *</Label>
                    <Select value={vehicle.category} onValueChange={(v) => setVehicle({ ...vehicle, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(VEHICLE_CATEGORY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Modelo *</Label>
                    <Input placeholder="Civic, Hilux..." value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
                  </div>
                  <div>
                    <Label>Marca</Label>
                    <Input placeholder="Honda, Toyota..." value={vehicle.brand} onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cor</Label>
                    <Input placeholder="Branco, Preto..." value={vehicle.color} onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => goToStep("cliente")}
              disabled={!existingVehicle && (plateInput.length < 7 || !vehicle.model || !vehicle.category)}
            >
              Próximo: Cliente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: CLIENTE */}
      {step === "cliente" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Dados do Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {existingVehicle ? (
              <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">{formatPhone(customer.phone)}</p>
                <p className="text-xs text-muted-foreground">Gênero: {customer.gender} · Uber: {customer.isUber ? "Sim" : "Não"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Nome do cliente" />
                </div>
                <div>
                  <Label>Telefone / WhatsApp *</Label>
                  <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="(11) 99999-0000" type="tel" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Gênero</Label>
                    <Select value={customer.gender} onValueChange={(v) => setCustomer({ ...customer, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOT_INFORMED">Não informado</SelectItem>
                        <SelectItem value="MALE">Masculino</SelectItem>
                        <SelectItem value="FEMALE">Feminino</SelectItem>
                        <SelectItem value="OTHER">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>É Uber?</Label>
                    <Select value={customer.isUber ? "sim" : "nao"} onValueChange={(v) => setCustomer({ ...customer, isUber: v === "sim" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("placa")} className="flex-1">Voltar</Button>
              <Button onClick={() => goToStep("servicos")} className="flex-1" disabled={!customer.name || !customer.phone}>
                Próximo: Serviços
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: SERVIÇOS */}
      {step === "servicos" && (
        <Card>
          <CardHeader><CardTitle>Serviços</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {availableServices.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => addService(svc)}
                  className={`text-left p-2 rounded-lg border text-sm transition-colors ${services.find((s) => s.serviceId === svc.id) ? "border-primary bg-primary/10" : "border-input hover:border-primary/50"}`}
                >
                  <p className="font-medium truncate">{svc.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(svc.basePrice)}</p>
                </button>
              ))}
            </div>

            {services.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                {services.map((s) => (
                  <div key={s.serviceId} className="flex items-center justify-between">
                    <span className="text-sm">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(s.unitPrice)}</span>
                      <button onClick={() => removeService(s.serviceId)} className="text-destructive hover:opacity-70">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            <div>
              <Label>Lavador</Label>
              <Select value={washerId} onValueChange={setWasherId}>
                <SelectTrigger><SelectValue placeholder="Selecionar lavador..." /></SelectTrigger>
                <SelectContent>
                  {washers.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Informações adicionais..." rows={2} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("cliente")} className="flex-1">Voltar</Button>
              <Button onClick={() => goToStep("checklist")} className="flex-1">Próximo: Checklist</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: CHECKLIST */}
      {step === "checklist" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Checklist de Avarias
              <Badge variant="outline" className="ml-auto text-xs">Opcional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {checklist.map((item, i) => (
                <button
                  key={item.area}
                  onClick={() => {
                    const updated = [...checklist];
                    updated[i] = { ...item, hasIssue: !item.hasIssue };
                    setChecklist(updated);
                  }}
                  className={`text-left p-2 rounded-lg border text-sm transition-colors ${item.hasIssue ? "border-red-400 bg-red-50" : "border-input hover:border-gray-300"}`}
                >
                  <span>{item.area}</span>
                  {item.hasIssue && <span className="ml-1 text-red-600">⚠</span>}
                </button>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-500" />Oportunidades de Serviço</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Serviços que o cliente pode contratar no futuro</p>

              <Select value="" onValueChange={addOpportunity}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço para adicionar..." />
                </SelectTrigger>
                <SelectContent>
                  {availableServices
                    .filter((svc) => !opportunities.includes(svc.id))
                    .map((svc) => (
                      <SelectItem key={svc.id} value={svc.id}>
                        {svc.name} — {formatCurrency(Number(svc.basePrice))}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {opportunityServices.length > 0 && (
                <div className="mt-3 space-y-2">
                  {opportunityServices.map((svc: any) => (
                    <div key={svc.id} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(Number(svc.basePrice))}</p>
                      </div>
                      <button onClick={() => removeOpportunity(svc.id)} className="text-destructive hover:opacity-70">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("servicos")} className="flex-1">Voltar</Button>
              <Button onClick={() => setStep("confirmacao")} className="flex-1">Próximo: Confirmar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: CONFIRMAÇÃO */}
      {step === "confirmacao" && (
        <Card>
          <CardHeader><CardTitle>Confirmar Entrada</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Veículo</p>
                <p className="font-bold">{vehicle.plate || existingVehicle?.plate}</p>
                <p>{existingVehicle?.brand || vehicle.brand} {existingVehicle?.model || vehicle.model}</p>
                <p className="text-xs text-muted-foreground">{VEHICLE_CATEGORY_LABELS[vehicle.category || existingVehicle?.category]}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                <p className="font-bold">{customer.name}</p>
                <p>{formatPhone(customer.phone)}</p>
                {customer.isUber && <Badge variant="info" className="mt-1">Uber</Badge>}
              </div>
            </div>

            {services.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Serviços</p>
                {services.map((s) => (
                  <div key={s.serviceId} className="flex justify-between text-sm py-0.5">
                    <span>{s.name}</span>
                    <span className="font-medium">{formatCurrency(s.unitPrice)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            {checklist.filter((c) => c.hasIssue).length > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs font-medium text-red-700 mb-1">Avarias registradas:</p>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {checklist.filter((c) => c.hasIssue).map((c) => <li key={c.area}>• {c.area}</li>)}
                </ul>
              </div>
            )}

            {opportunityServices.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs font-medium text-yellow-700 mb-1">Oportunidades futuras:</p>
                <ul className="text-xs text-yellow-700 space-y-0.5">
                  {opportunityServices.map((svc: any) => <li key={svc.id}>• {svc.name} ({formatCurrency(Number(svc.basePrice))})</li>)}
                </ul>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("checklist")} className="flex-1" disabled={loading}>Voltar</Button>
              <Button onClick={submitOrder} disabled={loading} className="flex-1" variant="success">
                {loading ? "Registrando..." : "Confirmar Entrada"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
