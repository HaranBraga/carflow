"use client";
import { useRef, useState, useEffect } from "react";
import { Search, Car, User, CheckCircle, Lightbulb, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const initialCustomer: CustomerData = { name: "", phone: "", gender: "NOT_INFORMED", isUber: false };
const initialVehicle: VehicleData = { plate: "", model: "", color: "", category: "POPULAR" };

export default function EntradaPage() {
  const submittingRef = useRef(false);
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

  // Busca de cliente por telefone (quando placa não existe)
  const [phoneSearch, setPhoneSearch] = useState("");
  const [phoneSearchResult, setPhoneSearchResult] = useState<any>(null);
  const [phoneSearching, setPhoneSearching] = useState(false);
  const [showPhoneSearch, setShowPhoneSearch] = useState(false);

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
    setPhoneSearch("");
    setPhoneSearchResult(null);
    setShowPhoneSearch(false);
  }

  // Auto-busca quando placa tem 7+ caracteres
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
        setShowPhoneSearch(false);
      } else {
        setExistingVehicle(null);
        setVehicle((v) => ({ ...v, plate: p.toUpperCase() }));
        setCustomer(initialCustomer);
        setPhoneSearchResult(null);
        setShowPhoneSearch(false);
      }
    } finally {
      setSearching(false);
    }
  }

  async function searchByPhone() {
    if (phoneSearch.replace(/\D/g, "").length < 8) return;
    setPhoneSearching(true);
    try {
      const res = await fetch(`/api/clientes?search=${phoneSearch.replace(/\D/g, "")}&limit=1`);
      const data = await res.json();
      const found = data.customers?.[0];
      setPhoneSearchResult(found || null);
      if (found) {
        setCustomer({ id: found.id, name: found.name, phone: found.phone, gender: found.gender, isUber: found.isUber });
      }
    } finally {
      setPhoneSearching(false);
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

  function serviceAppliesToCategory(svc: any): boolean {
    if (!svc.prices || svc.prices.length === 0) return true;
    const cat = vehicle.category || existingVehicle?.category;
    if (!cat) return true;
    return svc.prices.some((p: any) => p.category === cat);
  }

  function addService(svc: any) {
    if (services.find((s) => s.serviceId === svc.id)) return;
    setServices([...services, { serviceId: svc.id, name: svc.name, unitPrice: priceForService(svc), quantity: 1, discount: 0 }]);
  }

  function removeService(id: string) {
    setServices(services.filter((s) => s.serviceId !== id));
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

  // Tela de sucesso
  if (successInfo) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Entrada registrada!</h2>
              <p className="text-muted-foreground mt-1">
                <span className="font-mono font-bold">{successInfo.plate}</span> — {successInfo.customer}
              </p>
            </div>
            <Button onClick={reset} size="lg">
              <Car className="w-4 h-4 mr-2" /> Nova Entrada
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps = [
    { key: "placa", label: "Placa" },
    { key: "cliente", label: "Cliente" },
    { key: "servicos", label: "Serviços" },
    { key: "checklist", label: "Obs" },
    { key: "confirmacao", label: "Confirmar" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Car className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Entrada de Veículo</h1>
      </div>

      <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1">
        {steps.map(({ key, label }, i, arr) => (
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
          <CardHeader><CardTitle>Digite a placa do veículo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="ABC-1234 ou ABC1D23"
                  value={plateInput}
                  onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                  className="text-lg font-mono uppercase tracking-widest pr-8"
                  maxLength={8}
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <PlateScanner onPlateDetected={(plate) => { setPlateInput(plate); }} />
            </div>

            {existingVehicle && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-1">
                <p className="font-semibold text-green-800">✓ Veículo encontrado</p>
                <p className="text-sm">{existingVehicle.model} {existingVehicle.color ? `· ${existingVehicle.color}` : ""} — {VEHICLE_CATEGORY_LABELS[existingVehicle.category]}</p>
                <p className="text-sm text-muted-foreground">Cliente: <strong>{existingVehicle.customer?.name}</strong> · {formatPhone(existingVehicle.customer?.phone || "")}</p>
              </div>
            )}

            {!existingVehicle && plateInput.replace(/[^A-Z0-9]/gi, "").length >= 7 && !searching && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium">Placa não encontrada. Preencha os dados do veículo.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                    <Label>Modelo <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                    <Input placeholder="Civic, Hilux..." value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cor <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                    <Input placeholder="Branco, Preto..." value={vehicle.color} onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => goToStep("cliente")}
              disabled={searching || plateInput.replace(/[^A-Z0-9]/gi, "").length < 7 || (!existingVehicle && !vehicle.category)}
            >
              Próximo
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
              </div>
            ) : (
              <div className="space-y-4">
                {/* Buscar cliente existente por telefone */}
                {!customer.id && (
                  <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                    <p className="text-sm font-medium">Cliente já tem cadastro? Busque pelo telefone:</p>
                    <div className="flex gap-2">
                      <Input
                        value={phoneSearch}
                        onChange={(e) => setPhoneSearch(e.target.value)}
                        placeholder="(11) 99999-0000"
                        type="tel"
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={searchByPhone} disabled={phoneSearching}>
                        {phoneSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                    {phoneSearchResult && (
                      <div className="bg-green-50 border border-green-200 rounded p-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{phoneSearchResult.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPhone(phoneSearchResult.phone)}</p>
                        </div>
                        <Button size="sm" onClick={() => {
                          setCustomer({ id: phoneSearchResult.id, name: phoneSearchResult.name, phone: phoneSearchResult.phone, gender: phoneSearchResult.gender, isUber: phoneSearchResult.isUber });
                        }}>Usar</Button>
                      </div>
                    )}
                    {phoneSearch && !phoneSearching && phoneSearchResult === null && (
                      <p className="text-xs text-muted-foreground">Nenhum cliente encontrado com esse telefone.</p>
                    )}
                  </div>
                )}

                {/* Formulário novo cliente ou cliente selecionado */}
                {customer.id ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{formatPhone(customer.phone)}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setCustomer(initialCustomer)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground font-medium">— ou cadastre um novo cliente —</p>
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
            <p className="text-xs text-muted-foreground">
              Preços para <strong>{VEHICLE_CATEGORY_LABELS[vehicle.category || existingVehicle?.category]}</strong>
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
              {availableServices.filter(serviceAppliesToCategory).map((svc) => (
                <button key={svc.id} onClick={() => addService(svc)}
                  className={`text-left p-2 rounded-lg border text-sm transition-colors ${services.find((s) => s.serviceId === svc.id) ? "border-primary bg-primary/10" : "border-input hover:border-primary/50"}`}>
                  <p className="font-medium truncate">{svc.name}{svc.pricingType === "PER_M2" ? " (m²)" : ""}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(priceForService(svc))}</p>
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
                      <button onClick={() => removeService(s.serviceId)} className="text-destructive"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}
            <div>
              <Label>Observações</Label>
              <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Informações adicionais..." rows={2} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("cliente")} className="flex-1">Voltar</Button>
              <Button onClick={() => goToStep("checklist")} className="flex-1" disabled={services.length === 0}>
                {services.length === 0 ? "Selecione ao menos 1" : "Próximo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: OBS + OPORTUNIDADES */}
      {step === "checklist" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Avarias e Oportunidades
              <Badge variant="outline" className="ml-auto text-xs">Opcional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Observações de avarias</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: Arranhão no para-choque traseiro..." rows={3} />
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" /> Oportunidades de Serviço
              </p>
              <Select value="" onValueChange={addOpportunity}>
                <SelectTrigger><SelectValue placeholder="Adicionar serviço..." /></SelectTrigger>
                <SelectContent>
                  {availableServices.filter(serviceAppliesToCategory).filter((svc) => !opportunities.includes(svc.id)).map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>{svc.name} — {formatCurrency(priceForService(svc))}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {opportunityServices.length > 0 && (
                <div className="mt-2 space-y-1">
                  {opportunityServices.map((svc: any) => (
                    <div key={svc.id} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                      <span className="text-sm">{svc.name}</span>
                      <button onClick={() => removeOpportunity(svc.id)} className="text-destructive"><X className="w-4 h-4" /></button>
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
                <p className="font-bold font-mono">{vehicle.plate || plateInput}</p>
                <p>{vehicle.model} {vehicle.color}</p>
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
                {services.map((s) => (
                  <div key={s.serviceId} className="flex justify-between text-sm py-0.5">
                    <span>{s.name}</span><span className="font-medium">{formatCurrency(s.unitPrice)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}
            {obs && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs font-medium text-orange-700 mb-1">Avarias:</p>
                <p className="text-xs text-orange-700">{obs}</p>
              </div>
            )}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
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
