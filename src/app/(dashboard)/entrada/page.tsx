"use client";
import { useRef, useState, useEffect } from "react";
import { Car, User, CheckCircle, Lightbulb, X, Loader2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_CATEGORY_LABELS, formatPhone, formatCurrency } from "@/lib/utils";
import { PlateScanner } from "@/components/plate-scanner";

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
  color: string;
  category: string;
}

interface ServiceItem {
  serviceId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
}

const GENDER_OPTIONS = [
  { value: "NOT_INFORMED", label: "Não inf." },
  { value: "MALE", label: "Masculino" },
  { value: "FEMALE", label: "Feminino" },
  { value: "OTHER", label: "Outro" },
];

const initialCustomer: CustomerData = { name: "", phone: "", gender: "NOT_INFORMED", isUber: false };
const initialVehicle: VehicleData = { plate: "", model: "", color: "", category: "POPULAR" };

const STEPS: { key: Step; label: string }[] = [
  { key: "placa", label: "Placa" },
  { key: "cliente", label: "Cliente" },
  { key: "servicos", label: "Serviços" },
  { key: "checklist", label: "Avarias" },
  { key: "confirmacao", label: "Confirmar" },
];

export default function EntradaPage() {
  const submittingRef = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("placa");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ plate: string; customer: string } | null>(null);

  const [plateInput, setPlateInput] = useState("");
  const [existingVehicle, setExistingVehicle] = useState<any>(null);
  const [customer, setCustomer] = useState<CustomerData>(initialCustomer);
  const [vehicle, setVehicle] = useState<VehicleData>(initialVehicle);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [obs, setObs] = useState("");
  const [opportunities, setOpportunities] = useState<string[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [phoneSearching, setPhoneSearching] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // Rola para o topo ao trocar de step
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  function reset() {
    submittingRef.current = false;
    setStep("placa");
    setPlateInput("");
    setExistingVehicle(null);
    setCustomer(initialCustomer);
    setVehicle(initialVehicle);
    setServices([]);
    setObs("");
    setOpportunities([]);
    setOrderNotes("");
    setError("");
    setSuccessInfo(null);
  }

  // Auto-busca por telefone quando número tem 11 dígitos
  useEffect(() => {
    if (existingVehicle || customer.id) return;
    const digits = customer.phone.replace(/\D/g, "");
    if (digits.length < 11) return;
    const timer = setTimeout(async () => {
      setPhoneSearching(true);
      try {
        const res = await fetch(`/api/clientes?search=${digits}&limit=1`);
        const data = await res.json();
        const found = data.customers?.[0];
        if (found) {
          setCustomer({ id: found.id, name: found.name, phone: found.phone, gender: found.gender, isUber: found.isUber });
        }
      } finally {
        setPhoneSearching(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.phone]);

  // Auto-busca por placa
  useEffect(() => {
    const plate = plateInput.replace(/[^A-Z0-9]/gi, "");
    if (plate.length < 7) {
      setExistingVehicle(null);
      setCustomer(initialCustomer);
      setVehicle(initialVehicle);
      return;
    }
    const timer = setTimeout(() => searchPlate(plate), 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateInput]);

  async function searchPlate(plate?: string) {
    const p = plate || plateInput;
    if (p.replace(/[^A-Z0-9]/gi, "").length < 7) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/veiculos?plate=${p}`);
      const data = await res.json();
      if (data) {
        setExistingVehicle(data);
        setVehicle({ id: data.id, plate: data.plate, model: data.model || "", color: data.color || "", category: data.category });
        setCustomer({ id: data.customer.id, name: data.customer.name, phone: data.customer.phone, gender: data.customer.gender, isUber: data.customer.isUber });
      } else {
        setExistingVehicle(null);
        setVehicle((v) => ({ ...v, plate: p.toUpperCase() }));
        setCustomer(initialCustomer);
      }
    } finally {
      setSearching(false);
    }
  }

  async function loadServices() {
    const res = await fetch("/api/servicos");
    setAvailableServices(await res.json());
  }

  function goToStep(s: Step) {
    if (s === "servicos") loadServices();
    setStep(s);
  }

  function priceForService(svc: any): number {
    const cat = vehicle.category || existingVehicle?.category;
    if (cat && svc.prices?.length > 0) {
      const match = svc.prices.find((p: any) => p.category === cat);
      if (match) return Number(match.price);
    }
    return Number(svc.basePrice);
  }

  function serviceAppliesToCategory(svc: any, forOpportunity = false): boolean {
    if (!forOpportunity && svc.isOpportunityOnly) return false;
    if (!svc.prices || svc.prices.length === 0) return true;
    const cat = vehicle.category || existingVehicle?.category;
    if (!cat) return true;
    return svc.prices.some((p: any) => p.category === cat);
  }

  function toggleService(svc: any) {
    const exists = services.find((s) => s.serviceId === svc.id);
    if (exists) {
      setServices(services.filter((s) => s.serviceId !== svc.id));
    } else {
      setServices([...services, { serviceId: svc.id, name: svc.name, unitPrice: priceForService(svc), quantity: 1, discount: 0 }]);
    }
  }

  function addOpportunity(id: string) {
    if (!id || opportunities.includes(id)) return;
    setOpportunities([...opportunities, id]);
  }

  function removeOpportunity(id: string) {
    setOpportunities(opportunities.filter((s) => s !== id));
  }

  const total = services.reduce((sum, s) => sum + s.unitPrice * s.quantity - s.discount, 0);
  const opportunityServices = opportunities.map((sid) => availableServices.find((s) => s.id === sid)).filter(Boolean);

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
          body: JSON.stringify({ name: customer.name, phone: customer.phone, gender: customer.gender, isUber: customer.isUber }),
        });
        const cData = await cRes.json().catch(() => ({}));
        if (!cRes.ok) {
          if (cRes.status === 409 && cData.customer?.id) {
            customerId = cData.customer.id;
          } else {
            throw new Error(cData.error || "Falha ao cadastrar cliente");
          }
        } else {
          customerId = cData.id;
        }
      }

      if (!vehicleId) {
        const vRes = await fetch("/api/veiculos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...vehicle, plate: vehicle.plate || plateInput, customerId }),
        });
        const vData = await vRes.json().catch(() => ({}));
        if (!vRes.ok) {
          if (vRes.status === 409 && vData.vehicle?.id) {
            vehicleId = vData.vehicle.id;
          } else {
            throw new Error(vData.error || "Falha ao cadastrar veículo");
          }
        } else {
          vehicleId = vData.id;
        }
      }

      const checklistPayload = obs.trim() ? [{ area: "Observações", hasIssue: true, notes: obs.trim() }] : [];
      const opportunitiesPayload = opportunityServices.map((svc: any) => ({ description: svc.name, estimatedValue: priceForService(svc) }));

      const oRes = await fetch("/api/ordens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          notes: orderNotes,
          services: services.map((s) => ({ serviceId: s.serviceId, quantity: s.quantity, unitPrice: s.unitPrice, discount: s.discount })),
          checklist: checklistPayload,
          opportunities: opportunitiesPayload,
        }),
      });

      if (!oRes.ok) {
        const e = await oRes.json().catch(() => ({}));
        throw new Error(e.error || `Erro ao criar ordem (${oRes.status})`);
      }

      setSuccessInfo({ plate: vehicle.plate || plateInput, customer: customer.name });
    } catch (e: any) {
      setError(e?.message || "Erro ao registrar entrada");
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  }

  // ── Tela de sucesso ──
  if (successInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Entrada registrada!</h2>
          <p className="text-muted-foreground mt-1">
            <span className="font-mono font-bold text-foreground">{successInfo.plate}</span>
            {" — "}{successInfo.customer}
          </p>
        </div>
        <Button onClick={reset} size="lg" className="h-14 px-10 text-base w-full max-w-xs">
          <Car className="w-5 h-5 mr-2" /> Nova Entrada
        </Button>
      </div>
    );
  }

  // ── Progress bar ──
  const ProgressBar = () => (
    <div ref={topRef} className="space-y-2 mb-4">
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= stepIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{STEPS[stepIndex].label}</p>
        <p className="text-xs text-muted-foreground">{stepIndex + 1} / {STEPS.length}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <ProgressBar />

      {/* ─── STEP 1: PLACA ─── */}
      {step === "placa" && (
        <div className="space-y-4">
          {/* Input de placa estilizado */}
          <div className="bg-card rounded-2xl border p-4 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Placa do veículo</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="ABC-1234"
                  value={plateInput}
                  onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                  className="text-3xl font-mono font-bold uppercase tracking-[0.25em] text-center h-16 border-2 focus:border-primary rounded-xl"
                  maxLength={8}
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
                )}
              </div>
              <PlateScanner onPlateDetected={(plate) => setPlateInput(plate)} />
            </div>

            {/* Veículo encontrado */}
            {existingVehicle && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="font-semibold text-green-800 text-sm">Veículo encontrado</p>
                </div>
                <p className="text-sm font-medium">{existingVehicle.model}{existingVehicle.color ? ` · ${existingVehicle.color}` : ""}</p>
                <p className="text-xs text-muted-foreground">{VEHICLE_CATEGORY_LABELS[existingVehicle.category]}</p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-green-200">
                  <User className="w-3.5 h-3.5 text-green-700" />
                  <p className="text-sm text-green-800"><strong>{existingVehicle.customer?.name}</strong> · {formatPhone(existingVehicle.customer?.phone || "")}</p>
                </div>
              </div>
            )}

            {/* Veículo novo — campos extras */}
            {!existingVehicle && plateInput.replace(/[^A-Z0-9]/gi, "").length >= 7 && !searching && (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-sm text-blue-800 font-medium">Placa nova — preencha os dados:</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de veículo *</Label>
                  <Select value={vehicle.category} onValueChange={(v) => setVehicle({ ...vehicle, category: v })}>
                    <SelectTrigger className="mt-1 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VEHICLE_CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Modelo</Label>
                    <Input className="mt-1 h-11" placeholder="Civic, Hilux..." value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Cor</Label>
                    <Input className="mt-1 h-11" placeholder="Branco..." value={vehicle.color} onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            className="w-full h-14 text-base rounded-xl"
            onClick={() => goToStep("cliente")}
            disabled={searching || plateInput.replace(/[^A-Z0-9]/gi, "").length < 7 || (!existingVehicle && !vehicle.category)}
          >
            Próximo — Cliente
          </Button>
        </div>
      )}

      {/* ─── STEP 2: CLIENTE ─── */}
      {step === "cliente" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border p-4 space-y-4">
            {existingVehicle ? (
              <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">{formatPhone(customer.phone)}</p>
                  {customer.isUber && <Badge variant="info" className="mt-1 text-xs">Uber</Badge>}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Telefone / WhatsApp *</Label>
                  <div className="relative mt-1">
                    <Input
                      value={customer.phone}
                      onChange={(e) => setCustomer({ name: "", phone: e.target.value.replace(/\D/g, ""), gender: customer.gender, isUber: customer.isUber })}
                      placeholder="DDD + número"
                      type="tel"
                      inputMode="numeric"
                      className="h-14 text-xl tracking-widest pr-10"
                    />
                    {phoneSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                {customer.phone.replace(/\D/g, "").length >= 11 && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome *</Label>
                        {customer.id && (
                          <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Cliente encontrado
                          </span>
                        )}
                      </div>
                      <Input
                        value={customer.name}
                        onChange={(e) => !customer.id && setCustomer({ ...customer, name: e.target.value })}
                        placeholder={phoneSearching ? "Buscando..." : "Nome do cliente"}
                        readOnly={!!customer.id}
                        className={`h-12 ${customer.id ? "bg-green-50 border-green-300 text-green-900" : ""}`}
                      />
                    </div>

                    {/* Gênero — botões visuais */}
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Gênero</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {GENDER_OPTIONS.map((g) => (
                          <button
                            key={g.value}
                            type="button"
                            onClick={() => setCustomer({ ...customer, gender: g.value })}
                            className={`py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                              customer.gender === g.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-input text-muted-foreground"
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* É Uber — toggle */}
                    <button
                      type="button"
                      onClick={() => setCustomer({ ...customer, isUber: !customer.isUber })}
                      className={`w-full py-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        customer.isUber
                          ? "bg-primary/10 text-primary border-primary"
                          : "bg-background border-input text-muted-foreground"
                      }`}
                    >
                      <Car className="w-4 h-4" />
                      {customer.isUber ? "✓ Motorista Uber" : "Motorista Uber?"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("placa")} className="h-14 px-5 rounded-xl">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => goToStep("servicos")}
              className="flex-1 h-14 text-base rounded-xl"
              disabled={!customer.name || customer.phone.replace(/\D/g, "").length < 10}
            >
              Próximo — Serviços
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: SERVIÇOS ─── */}
      {step === "servicos" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {VEHICLE_CATEGORY_LABELS[vehicle.category || existingVehicle?.category]}
              </p>
              {services.length > 0 && (
                <Badge variant="secondary">{services.length} selecionado{services.length > 1 ? "s" : ""}</Badge>
              )}
            </div>

            {/* Grid de serviços — sem caixa de scroll restrita */}
            <div className="grid grid-cols-2 gap-2">
              {availableServices.filter((s) => serviceAppliesToCategory(s, false)).map((svc) => {
                const selected = !!services.find((s) => s.serviceId === svc.id);
                return (
                  <button
                    key={svc.id}
                    onClick={() => toggleService(svc)}
                    className={`text-left p-3 rounded-xl border-2 transition-all active:scale-[0.97] min-h-[68px] flex flex-col justify-between ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background"
                    }`}
                  >
                    <p className={`text-sm font-medium leading-tight ${selected ? "text-primary" : ""}`}>
                      {svc.name}{svc.pricingType === "PER_M2" ? " (m²)" : ""}
                    </p>
                    <p className={`text-xs mt-1 ${selected ? "text-primary/70" : "text-muted-foreground"}`}>
                      {formatCurrency(priceForService(svc))}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Resumo selecionados */}
            {services.length > 0 && (
              <div className="border-t pt-3 space-y-1.5">
                {services.map((s) => (
                  <div key={s.serviceId} className="flex items-center justify-between">
                    <span className="text-sm">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatCurrency(s.unitPrice)}</span>
                      <button
                        onClick={() => setServices(services.filter((sv) => sv.serviceId !== s.serviceId))}
                        className="text-destructive p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t text-base">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Observações</Label>
              <Textarea
                className="mt-1"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Informações adicionais..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("cliente")} className="h-14 px-5 rounded-xl">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => goToStep("checklist")}
              className="flex-1 h-14 text-base rounded-xl"
              disabled={services.length === 0}
            >
              {services.length === 0 ? "Selecione ao menos 1" : "Próximo — Avarias"}
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: AVARIAS + OPORTUNIDADES ─── */}
      {step === "checklist" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border p-4 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Avarias observadas</Label>
              <Textarea
                className="mt-1"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Ex: Arranhão no para-choque traseiro..."
                rows={4}
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0" />
                <p className="text-sm font-medium">Oportunidades de Serviço</p>
                <Badge variant="outline" className="ml-auto text-xs">Opcional</Badge>
              </div>

              <Select value="" onValueChange={addOpportunity}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Adicionar oportunidade..." />
                </SelectTrigger>
                <SelectContent>
                  {availableServices
                    .filter((s) => serviceAppliesToCategory(s, true))
                    .filter((svc) => !opportunities.includes(svc.id))
                    .map((svc) => (
                      <SelectItem key={svc.id} value={svc.id}>
                        {svc.name} — {formatCurrency(priceForService(svc))}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {opportunityServices.length > 0 && (
                <div className="space-y-2">
                  {opportunityServices.map((svc: any) => (
                    <div key={svc.id} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5">
                      <span className="text-sm font-medium">{svc.name}</span>
                      <button onClick={() => removeOpportunity(svc.id)} className="text-destructive ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("servicos")} className="h-14 px-5 rounded-xl">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button onClick={() => setStep("confirmacao")} className="flex-1 h-14 text-base rounded-xl">
              Próximo — Confirmar
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 5: CONFIRMAÇÃO ─── */}
      {step === "confirmacao" && (
        <div className="space-y-4">
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border rounded-2xl p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Veículo</p>
              <p className="font-bold font-mono text-lg">{vehicle.plate || plateInput}</p>
              <p className="text-sm">{vehicle.model} {vehicle.color}</p>
              <p className="text-xs text-muted-foreground">{VEHICLE_CATEGORY_LABELS[vehicle.category || existingVehicle?.category]}</p>
            </div>
            <div className="bg-card border rounded-2xl p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</p>
              <p className="font-bold">{customer.name}</p>
              <p className="text-sm text-muted-foreground">{formatPhone(customer.phone)}</p>
              {customer.isUber && <Badge variant="info" className="text-xs">Uber</Badge>}
            </div>
          </div>

          {/* Serviços */}
          {services.length > 0 && (
            <div className="bg-card border rounded-2xl p-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Serviços</p>
              {services.map((s) => (
                <div key={s.serviceId} className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="font-medium">{formatCurrency(s.unitPrice)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t pt-2 text-base">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {obs && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Avarias</p>
              <p className="text-sm text-orange-700">{obs}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("checklist")} className="h-14 px-5 rounded-xl" disabled={loading}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              onClick={submitOrder}
              disabled={loading}
              className="flex-1 h-14 text-base rounded-xl"
              variant="success"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Registrando...</>
              ) : (
                "✓ Confirmar Entrada"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
