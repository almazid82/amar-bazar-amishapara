import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import brandLogo from "../../../assets/amar-bazar-logo.svg";

type Order = {
  id: string; public_code: string; status: string; customer_decision: string; recipient_name_snapshot: string;
  phone_snapshot: string; address_snapshot: string; landmark_snapshot: string | null; area_name_snapshot: string;
  estimated_subtotal: number; estimated_delivery_fee: number; estimated_total: number; final_subtotal: number | null;
  final_delivery_fee: number | null; final_total: number | null; quote_version: number; estimated_eta: string | null;
  created_at: string; customer_note: string | null;
};
type OrderItem = { id: string; requested_name: string; requested_unit_label: string; requested_unit_price: number; quantity: number; fulfillment_state: string; fulfilled_name: string | null; final_unit_price: number | null };
type Product = { id: string; shop_id: string; category_id: string; sku: string | null; name: string; description: string | null; image_path: string | null; unit_label: string; price: number; is_active: boolean; is_available: boolean; track_stock: boolean; product_inventory?: { on_hand: number; reserved: number }[] };
type Category = { id: string; name: string; slug: string; parent_id: string | null; sort_order: number; is_active: boolean };
type Shop = { id: string; name: string; slug: string; description?: string | null; image_path?: string | null; phone_e164?: string | null; is_active: boolean };
type Customer = { customer_id: string; display_name: string; phone_e164: string | null; order_count: number; latest_order_at: string | null };
type DeliveryRecord = { id: string; order_id: string; driver_name: string; driver_phone_e164: string; status: string; assigned_by: string; assigned_at: string; completed_at: string | null; notes: string | null };
type CodPayment = { id: string; order_id: string; status: string; amount_due: number; amount_collected: number; collected_by: string | null; collected_at: string | null; note: string | null };
type DashboardMetrics = { total_orders: number; pending_orders: number; in_progress_orders: number; completed_orders: number; cancelled_orders: number; gross_sales: number; cod_collected: number; outstanding_cod: number; top_products: { product_name: string; quantity_sold: number; gross_sales: number }[] };
type Notice = { kind: "success" | "error" | "info"; text: string };
type Tab = "overview" | "orders" | "products" | "categories" | "shops" | "customers" | "delivery" | "payments" | "reports" | "staff" | "notifications" | "settings";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
const previewMode = new URLSearchParams(window.location.search).get("preview") === "1";
const sections: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◫" }, { id: "orders", label: "Orders", icon: "▤" },
  { id: "products", label: "Products & inventory", icon: "▧" }, { id: "categories", label: "Categories", icon: "◈" },
  { id: "shops", label: "Shops", icon: "⌂" }, { id: "customers", label: "Customers", icon: "♙" },
  { id: "delivery", label: "Delivery", icon: "➜" }, { id: "payments", label: "COD payments", icon: "৳" },
  { id: "reports", label: "Reports", icon: "▥" }, { id: "staff", label: "Staff & audit", icon: "♧" },
  { id: "notifications", label: "Notifications", icon: "◉" }, { id: "settings", label: "Store settings", icon: "⚙" },
];
const money = (n: number | null | undefined) => `৳${Number(n ?? 0).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const dateTime = (value: string) => new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const dateKey = (date = new Date()) => { const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const values = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${values.year}-${values.month}-${values.day}`; };
const human = (value: string) => value === "pending_submission" ? "Waiting for WhatsApp send" : value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesChecked, setRolesChecked] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string; fee: number; is_active: boolean }[]>([]);
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [codPayments, setCodPayments] = useState<CodPayment[]>([]);
  const [stockMovements, setStockMovements] = useState<Record<string, unknown>[]>([]);
  const [staffRows, setStaffRows] = useState<Record<string, unknown>[]>([]);
  const [auditRows, setAuditRows] = useState<Record<string, unknown>[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dataLoading, setDataLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOffset, setCustomerOffset] = useState(0);
  const [reportFrom, setReportFrom] = useState(() => `${dateKey().slice(0, 8)}01`);
  const [reportTo, setReportTo] = useState(() => dateKey());
  const [busy, setBusy] = useState(false);

  const isAdmin = roles.includes("admin");
  const canOrders = isAdmin || roles.includes("order_operator");
  const canCatalog = isAdmin || roles.includes("catalog_manager");

  const message = (kind: Notice["kind"], text: string) => { setNotice({ kind, text }); window.setTimeout(() => setNotice(null), 4500); };

  const refresh = useCallback(async () => {
    if (!supabase || !session) return;
    setDataLoading(true);
    const jobs: { key: string; promise: PromiseLike<{ data: unknown; error: { message: string } | null }> }[] = [];
    const add = (keyName: string, promise: PromiseLike<{ data: unknown; error: { message: string } | null }>) => jobs.push({ key: keyName, promise });
    if (canOrders) {
      add("orders", supabase.from("orders").select("id,public_code,status,customer_decision,recipient_name_snapshot,phone_snapshot,address_snapshot,landmark_snapshot,area_name_snapshot,estimated_subtotal,estimated_delivery_fee,estimated_total,final_subtotal,final_delivery_fee,final_total,quote_version,estimated_eta,created_at,customer_note").order("created_at", { ascending: false }).limit(500));
      add("notifications", supabase.from("notification_outbox").select("id,order_id,event_type,channel,template_name,recipient_type,status,attempt_count,next_attempt_at,provider_message_id,last_error_code,created_at,updated_at").order("created_at", { ascending: false }).limit(100));
      add("delivery", supabase.from("delivery_records").select("id,order_id,driver_name,driver_phone_e164,status,assigned_by,assigned_at,completed_at,notes").order("assigned_at", { ascending: false }).limit(200));
      add("payments", supabase.from("cod_payments").select("id,order_id,status,amount_due,amount_collected,collected_by,collected_at,note").order("updated_at", { ascending: false }).limit(500));
      if (tab === "customers") add("customers", supabase.rpc("admin_list_customers", { p_search: customerSearch || null, p_limit: 100, p_offset: customerOffset }));
      if (tab === "reports" || tab === "overview") add("metrics", supabase.rpc("admin_dashboard_metrics", { p_from: tab === "reports" ? reportFrom : dateKey(), p_to: tab === "reports" ? reportTo : dateKey() }));
    }
    if (canCatalog) {
      add("products", supabase.from("products").select("id,shop_id,category_id,sku,name,description,image_path,unit_label,price,is_active,is_available,track_stock,product_inventory(on_hand,reserved)").order("name"));
      add("categories", supabase.from("categories").select("id,name,slug,parent_id,sort_order,is_active").order("sort_order"));
      add("shops", supabase.from("shops").select("id,name,slug,description,image_path,phone_e164,is_active").order("name"));
      add("areas", supabase.from("delivery_areas").select("id,name,fee,is_active").order("sort_order"));
      add("movements", supabase.from("stock_movements").select("id,product_id,movement_type,quantity_delta,order_id,reason,created_at").order("created_at", { ascending: false }).limit(100));
    }
    if (isAdmin && tab === "settings") add("settings", supabase.from("store_settings").select("*").eq("id", true).maybeSingle());
    if (isAdmin && tab === "staff") {
      add("staff", supabase.rpc("admin_list_staff"));
      add("audit", supabase.from("admin_audit_log").select("id,actor_user_id,action,entity_type,entity_id,changed_fields,created_at").order("created_at", { ascending: false }).limit(100));
    }
    const responses = await Promise.all(jobs.map((job) => job.promise));
    const failed = responses.find((response) => response.error);
    if (failed?.error) { message("error", failed.error.message); setDataLoading(false); return; }
    const data = Object.fromEntries(jobs.map((job, index) => [job.key, responses[index].data]));
    if (data.orders) setOrders((data.orders as Order[]) ?? []);
    if (data.notifications) setNotifications((data.notifications as Record<string, unknown>[]) ?? []);
    if (data.delivery) setDeliveryRecords((data.delivery as DeliveryRecord[]) ?? []);
    if (data.payments) setCodPayments((data.payments as CodPayment[]) ?? []);
    if (data.customers) setCustomers((data.customers as Customer[]) ?? []);
    if (data.metrics) setMetrics(data.metrics as DashboardMetrics);
    if (data.products) setProducts((data.products as Product[]) ?? []);
    if (data.categories) setCategories((data.categories as Category[]) ?? []);
    if (data.shops) setShops((data.shops as Shop[]) ?? []);
    if (data.areas) setAreas((data.areas as typeof areas) ?? []);
    if (data.movements) setStockMovements((data.movements as Record<string, unknown>[]) ?? []);
    if (data.settings) setSettings(data.settings as Record<string, unknown>);
    if (data.staff) setStaffRows((data.staff as Record<string, unknown>[]) ?? []);
    if (data.audit) setAuditRows((data.audit as Record<string, unknown>[]) ?? []);
    setDataLoading(false);
  }, [session, canCatalog, canOrders, isAdmin, tab, customerSearch, customerOffset, reportFrom, reportTo]);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setRoles([]); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    if (!supabase || !session) { setRoles([]); setRolesChecked(false); return; }
    setRolesChecked(false);
    void supabase.rpc("current_staff_roles").then(({ data, error }) => {
      if (!alive) return;
      if (error) { setRoles([]); setRolesChecked(true); message("error", "Admin access could not be verified. Apply the Phase 5 migration first."); return; }
      setRoles(Array.isArray(data) ? data : []);
      setRolesChecked(true);
    });
    return () => { alive = false; };
  }, [session]);

  useEffect(() => {
    if (!session || roles.length === 0) return;
    if (!canOrders && tab === "overview") setTab("products");
    void refresh();
  }, [session, roles, canOrders, tab, refresh]);

  useEffect(() => {
    if (!supabase || !session || !canOrders) return;
    const channel = supabase.channel("admin-order-queue")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const fresh = payload.new as Order;
        message("info", `New order request ${fresh.public_code} received.`);
        void refresh();
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [session, canOrders, refresh]);

  const openOrder = async (order: Order) => {
    setSelected(order);
    if (!supabase) return;
    const [{ data: lines }, { data: latest }] = await Promise.all([
      supabase.from("order_items").select("id,requested_name,requested_unit_label,requested_unit_price,quantity,fulfillment_state,fulfilled_name,final_unit_price").eq("order_id", order.id).order("created_at"),
      supabase.from("orders").select("id,public_code,status,customer_decision,recipient_name_snapshot,phone_snapshot,address_snapshot,landmark_snapshot,area_name_snapshot,estimated_subtotal,estimated_delivery_fee,estimated_total,final_subtotal,final_delivery_fee,final_total,quote_version,estimated_eta,created_at,customer_note").eq("id", order.id).maybeSingle(),
    ]);
    setDetailItems(lines ?? []);
    if (latest) setSelected(latest);
  };

  const operation = async (body: Record<string, unknown>, success: string) => {
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("order-operations", { body });
    setBusy(false);
    if (error || data?.error) { message("error", data?.error?.message ?? error?.message ?? "Could not complete this action."); return false; }
    message("success", success); await refresh(); return true;
  };

  const retryNotification = async (id: string) => { if (await operation({ action: "retry_notification", outboxId: id }, "Notification queued for retry.")) await refresh(); };

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = filter === "all" || order.status === filter;
    const query = search.trim().toLowerCase();
    return matchesStatus && (!query || `${order.public_code} ${order.recipient_name_snapshot} ${order.phone_snapshot}`.toLowerCase().includes(query));
  }), [orders, filter, search]);

  if (!ready) return <div className="boot"><span className="loader" />Loading Amar Bazar…</div>;
  if (!supabase) return previewMode ? <DemoPreview /> : <SetupScreen />;
  if (!session) return <LoginScreen onLogin={(next) => setSession(next)} />;
  if (!rolesChecked) return <div className="boot"><div className="access-card"><Brand /><div className="loader" /><h2>Checking staff access</h2><p>Verifying this account's assigned Amar Bazar role.</p></div></div>;
  if (roles.length === 0) return <div className="boot"><div className="access-card"><Brand /><div className="setup-glyph">⌑</div><h2>Staff access required</h2><p>This account is not assigned an active Amar Bazar staff role. Ask the project owner to provision your access.</p><button className="text-button" onClick={() => void supabase.auth.signOut()}>Sign out</button></div></div>;

  const visibleSections = sections.filter((item) => {
    if (["overview", "orders"].includes(item.id)) return canOrders;
    if (["products", "categories", "shops"].includes(item.id)) return canCatalog;
    if (["customers", "delivery", "payments", "reports"].includes(item.id)) return canOrders;
    if (item.id === "staff") return isAdmin;
    if (item.id === "settings") return isAdmin;
    if (item.id === "notifications") return canOrders;
    return false;
  });

  return <div className="shell">
    <aside className="sidebar">
      <Brand />
      <div className="workspace"><span className="live-dot" /> LOCAL OPERATIONS</div>
      <nav>{visibleSections.map((item) => <button key={item.id} className={`nav-item ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === "orders" && orders.filter((o) => ["pending_submission", "pending_verification"].includes(o.status)).length > 0 && <b className="nav-count">{orders.filter((o) => ["pending_submission", "pending_verification"].includes(o.status)).length}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="operator"><span className="avatar">{session.user.email?.[0]?.toUpperCase() ?? "A"}</span><div><strong>{session.user.email}</strong><small>{roles.map(human).join(" · ")}</small></div></div><div className="developer-credit"><span>BUILT WITH CARE BY</span><strong>Shamsul Al Mazid</strong><small>Statistics · Dhaka College</small></div><button className="signout" onClick={() => void supabase.auth.signOut()}>Sign out <span>↗</span></button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb"><span>Amar Bazar</span><i>/</i>{sections.find((item) => item.id === tab)?.label}</div><div className="top-actions"><span className="pilot-pill"><span /> Pilot workspace</span><button className="icon-button" aria-label="Refresh" onClick={() => void refresh()}>↻</button></div></header>
      <div className="content">
        {notice && <div className={`toast ${notice.kind}`} role="status">{notice.kind === "success" ? "✓" : notice.kind === "error" ? "!" : "•"} {notice.text}<button onClick={() => setNotice(null)}>×</button></div>}
        {dataLoading && <div className="loading-inline" role="status"><span className="loader" />Loading current database records…</div>}
        {tab === "overview" && canOrders && <Overview orders={orders} notifications={notifications} metrics={metrics} onOpen={openOrder} onAllOrders={() => setTab("orders")} />}
        {tab === "orders" && canOrders && <OrderList orders={filteredOrders} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} onOpen={openOrder} />}
        {tab === "products" && canCatalog && <Products products={products} shops={shops} categories={categories} movements={stockMovements} inventory={products.map((p) => ({ id: p.id, on_hand: Number(p.product_inventory?.[0]?.on_hand ?? 0), reserved: Number(p.product_inventory?.[0]?.reserved ?? 0) }))} onSaved={refresh} onMessage={message} />}
        {tab === "categories" && canCatalog && <Categories categories={categories} onSaved={refresh} onMessage={message} />}
        {tab === "shops" && canCatalog && <Shops shops={shops} onSaved={refresh} onMessage={message} />}
        {tab === "customers" && canOrders && <Customers customers={customers} search={customerSearch} setSearch={(value) => { setCustomerSearch(value); setCustomerOffset(0); }} offset={customerOffset} setOffset={setCustomerOffset} />}
        {tab === "delivery" && canOrders && <Delivery orders={orders} records={deliveryRecords} busy={busy} onOperation={operation} onRefresh={refresh} />}
        {tab === "payments" && canOrders && <Payments payments={codPayments} orders={orders} busy={busy} onOperation={operation} onRefresh={refresh} onMessage={message} />}
        {tab === "reports" && canOrders && <Reports metrics={metrics} from={reportFrom} to={reportTo} setFrom={setReportFrom} setTo={setReportTo} onRefresh={refresh} />}
        {tab === "staff" && isAdmin && <Staff staff={staffRows} audit={auditRows} busy={busy} onOperation={operation} onRefresh={refresh} onMessage={message} />}
        {tab === "notifications" && canOrders && <Notifications rows={notifications} isAdmin={isAdmin} onRetry={retryNotification} />}
        {tab === "settings" && isAdmin && <Settings settings={settings} areas={areas} onSaved={refresh} onMessage={message} />}
        <div className="developer-signature"><span>DESIGNED & DEVELOPED BY</span><strong>Shamsul Al Mazid</strong><small>Statistics · Dhaka College</small></div>
      </div>
    </main>
    {selected && <OrderDialog order={selected} items={detailItems} deliveryRecords={deliveryRecords} codPayments={codPayments} canUpdate={canOrders} busy={busy} onClose={() => setSelected(null)} onRefresh={refresh} onMessage={message} onOperation={operation} />}
  </div>;
}

function Brand() { return <div className="brand"><img className="brand-logo" src={brandLogo} alt="আমার বাজার" /><span><small>OPERATIONS</small></span></div>; }

function SetupScreen() { return <div className="boot"><div className="access-card"><Brand /><div className="setup-glyph">⚙</div><h1>Connect the admin workspace</h1><p>Copy <code>.env.example</code> to <code>.env</code> and add your Supabase project URL and publishable key. Secret keys do not belong here.</p><div className="setup-note">The live workspace loads real records only after secure staff sign-in. To explore the layout without connecting Supabase, open the clearly labelled read-only demo preview.</div><a className="primary demo-link" href="?preview=1">View demo preview <span>→</span></a></div></div>; }

function DemoPreview() {
  const [tab, setTab] = useState<"overview" | "orders" | "products" | "settings">("overview");
  const demoOrders = [
    { code: "AB-DEMO-1041", customer: "Demo Customer A", area: "Amishapara · example area", total: 460, status: "pending_verification", items: "Rice, eggs, vegetables" },
    { code: "AB-DEMO-1040", customer: "Demo Customer B", area: "Nearby village · example area", total: 735, status: "awaiting_customer_approval", items: "Cooking oil, lentils, milk" },
    { code: "AB-DEMO-1039", customer: "Demo Customer C", area: "Amishapara · example area", total: 320, status: "preparing", items: "Chicken, spices, onions" },
    { code: "AB-DEMO-1038", customer: "Demo Customer D", area: "Nearby village · example area", total: 585, status: "out_for_delivery", items: "Rice, potatoes, cooking oil" },
  ];
  const nav: { id: typeof tab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "◫" }, { id: "orders", label: "Orders", icon: "▤" },
    { id: "products", label: "Products & stock", icon: "▧" }, { id: "settings", label: "Store settings", icon: "⚙" },
  ];
  return <div className="shell demo-shell">
    <div className="demo-banner"><strong>DEMO PREVIEW · FICTIONAL DATA</strong><span>Read-only view. No real customers, orders, or actions are connected.</span><a href="/">Back to setup</a></div>
    <aside className="sidebar"><Brand /><div className="workspace"><span className="live-dot" /> DESIGN PREVIEW</div><nav>{nav.map((item) => <button key={item.id} className={`nav-item ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav><div className="sidebar-bottom"><div className="developer-credit"><span>BUILT WITH CARE BY</span><strong>Shamsul Al Mazid</strong><small>Statistics · Dhaka College</small></div></div></aside>
    <main className="main"><header className="topbar"><div className="crumb"><span>Amar Bazar</span><i>/</i>{nav.find((item) => item.id === tab)?.label}</div><div className="top-actions"><span className="pilot-pill"><span /> Demo only</span></div></header><div className="content">
      {tab === "overview" && <><PageTitle eyebrow="DESIGN PREVIEW · AMISHAPARA" title="Good afternoon" body="A read-only look at the local market operations dashboard." /><div className="metric-grid"><Metric label="New requests" value="3" change="Example requests only" icon="▤" tone="mint" /><Metric label="In progress" value="7" change="Fictional workflow states" icon="◷" tone="gold" /><Metric label="Orders today" value="5" change="Demo count, not live data" icon="↗" tone="blue" /><Metric label="Delivered sales today" value={money(1240)} change="Example amount only" icon="৳" tone="coral" /></div><section className="panel order-list-panel"><div className="panel-heading"><div><h2>Sample order queue</h2><p>Fictional records to preview how orders appear</p></div><button className="link-button" onClick={() => setTab("orders")}>View demo orders →</button></div><DemoOrderTable orders={demoOrders.slice(0, 3)} /></section></>}
      {tab === "orders" && <><PageTitle eyebrow="DESIGN PREVIEW · FICTIONAL DATA" title="Demo orders" body="These example records are not real requests and cannot be edited or processed." /><section className="panel order-list-panel"><DemoOrderTable orders={demoOrders} /></section></>}
      {tab === "products" && <><PageTitle eyebrow="DESIGN PREVIEW" title="Products & stock" body="Example grocery catalog layout. No real inventory is connected." /><section className="panel order-list-panel"><div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>SHOP / CATEGORY</th><th>PRICE</th><th>STOCK</th><th>AVAILABILITY</th></tr></thead><tbody>{[["Miniket rice", "Amar Bazar Grocery · Staples", 72, "18 kg", "Available"], ["Fresh eggs", "Amar Bazar Grocery · Dairy & eggs", 145, "24 pcs", "Available"], ["Seasonal vegetables", "Local Fresh Produce · Vegetables", 60, "Shop check", "Check with shop"], ["Cooking oil", "Amar Bazar Grocery · Staples", 175, "12 bottles", "Available"]].map((item) => <tr key={String(item[0])}><td><strong>{String(item[0])}</strong><small>Sample item</small></td><td>{String(item[1])}</td><td className="amount">{money(Number(item[2]))}</td><td>{String(item[3])}</td><td><Status value={String(item[4])} /></td></tr>)}</tbody></table></div></section></>}
      {tab === "settings" && <><PageTitle eyebrow="DESIGN PREVIEW" title="Store settings" body="Example settings panel. No live store configuration can be changed here." /><div className="panel demo-settings"><strong>Amar Bazar · Local pilot</strong><p>Orders: paused in demo · Cash on Delivery: example setting</p><p>Delivery areas and charges: connect Supabase to load approved values.</p></div></>}
      <div className="developer-signature"><span>DESIGNED & DEVELOPED BY</span><strong>Shamsul Al Mazid</strong><small>Statistics · Dhaka College</small></div>
      <p className="demo-footnote">All names, order references, items, statuses, and totals on this page are fictional sample data.</p>
    </div></main>
  </div>;
}

function DemoOrderTable({ orders }: { orders: { code: string; customer: string; area: string; total: number; status: string; items: string }[] }) {
  return <div className="table-scroll"><table><thead><tr><th>ORDER</th><th>DEMO CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th><th>AREA</th></tr></thead><tbody>{orders.map((order) => <tr key={order.code}><td><strong className="order-code">{order.code}</strong><small>Sample record</small></td><td><strong>{order.customer}</strong><small>Phone hidden in demo</small></td><td>{order.items}</td><td className="amount">{money(order.total)}</td><td><Status value={order.status} /></td><td>{order.area}</td></tr>)}</tbody></table></div>;
}

function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!supabase) return; setPending(true); setError(""); const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); setPending(false); if (authError || !data.session) setError(authError?.message ?? "Could not sign in."); else onLogin(data.session); };
  return <div className="login-page"><div className="login-art"><div className="art-glow" /><Brand /><div className="login-art-copy"><span className="eyebrow">AMISHAPARA · LOCAL PILOT</span><h1>Your neighborhood,<br /><em>in good hands.</em></h1><p>One calm place to coordinate orders, verify local stock and keep customers informed.</p><div className="art-steps"><span>01 <b>Review requests</b></span><span>02 <b>Check with shops</b></span><span>03 <b>Confirm & deliver</b></span></div></div><div className="login-art-footer">AMAR BAZAR <span>·</span> LOCAL OPERATIONS</div></div>
    <div className="login-panel"><div className="login-form-wrap"><span className="eyebrow green">WELCOME BACK</span><h2>Sign in to your workspace</h2><p>Use your provisioned staff account to continue.</p><form onSubmit={(event) => void submit(event)}><label>Work email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@amarbazar.com" /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>{error && <div className="form-error">{error}</div>}<button className="primary wide" disabled={pending}>{pending ? "Signing in…" : "Sign in securely"}<span>→</span></button></form><div className="secure-caption"><span>◈</span> Access is checked against your assigned staff role.</div><div className="login-developer-credit"><span>DESIGNED & DEVELOPED BY</span><strong>Shamsul Al Mazid</strong><small>Statistics · Dhaka College</small></div></div></div></div>;
}

function PageTitle({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: ReactNode }) { return <div className="page-title"><div><div className="eyebrow green">{eyebrow}</div><h1>{title}</h1><p>{body}</p></div>{action}</div>; }

function Overview({ orders, notifications, metrics, onOpen, onAllOrders }: { orders: Order[]; notifications: Record<string, unknown>[]; metrics: DashboardMetrics | null; onOpen: (order: Order) => void; onAllOrders: () => void }) {
  const pending = orders.filter((o) => ["pending_submission", "pending_verification"].includes(o.status)).length;
  const failed = notifications.filter((n) => ["dead_letter", "unknown"].includes(String(n.status))).length;
  return <>
    <PageTitle eyebrow={`${new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date()).toUpperCase()} · AMISHAPARA`} title="Good afternoon" body="Here’s what’s happening across your local market today." action={<button className="secondary" onClick={onAllOrders}>View all orders <span>↗</span></button>} />
    <div className="metric-grid">
      <Metric label="New requests" value={metrics ? metrics.pending_orders : "—"} change="Awaiting shop/customer action · today" icon="▤" tone="mint" />
      <Metric label="In progress" value={metrics ? metrics.in_progress_orders : "—"} change="Confirmed through out for delivery · today" icon="◷" tone="gold" />
      <Metric label="Orders today" value={metrics ? metrics.total_orders : "—"} change="Database count · today" icon="↗" tone="blue" />
      <Metric label="Gross sales today" value={metrics ? money(metrics.gross_sales) : "—"} change={`${metrics?.completed_orders ?? "—"} delivered orders · today`} icon="৳" tone="coral" />
    </div>
    <div className="overview-grid">
      <section className="panel recent-panel"><div className="panel-heading"><div><h2>Needs attention</h2><p>New order requests waiting for a human check</p></div><button className="link-button" onClick={onAllOrders}>All orders →</button></div>
        <OrderTable orders={orders.filter((o) => ["pending_submission", "pending_verification", "awaiting_customer_approval"].includes(o.status)).slice(0, 6)} onOpen={onOpen} compact /></section>
      <section className="panel pulse-panel"><div className="panel-heading"><div><h2>Operations pulse</h2><p>Today at a glance</p></div><span className="pulse-icon">⌁</span></div>
        <div className="pulse-stat"><span>Awaiting shop check</span><strong>{pending}</strong></div><div className="pulse-stat"><span>On the way</span><strong>{orders.filter((o) => o.status === "out_for_delivery").length}</strong></div><div className="pulse-stat"><span>Notification issues</span><strong className={failed ? "warning-text" : ""}>{failed}</strong></div>
        <div className="pulse-hint"><span>✳</span><p>Orders are requests until the shop check and customer approval are complete.</p></div>
      </section>
    </div>
  </>;
}
function Metric({ label, value, change, icon, tone }: { label: string; value: React.ReactNode; change: string; icon: string; tone: string }) { return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><strong>{value}</strong><small>{change}</small></div>; }

function OrderList({ orders, search, setSearch, filter, setFilter, onOpen }: { orders: Order[]; search: string; setSearch: (value: string) => void; filter: string; setFilter: (value: string) => void; onOpen: (order: Order) => void }) {
  return <><PageTitle eyebrow="ORDER OPERATIONS" title="Orders" body="Review requests, confirm shop availability and move approved orders forward." />
    <section className="panel order-list-panel"><div className="table-tools"><div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, customer or phone" /></div><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option>{["pending_submission", "pending_verification", "awaiting_customer_approval", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled", "rejected", "expired"].map((s) => <option key={s} value={s}>{human(s)}</option>)}</select></div>
      <OrderTable orders={orders} onOpen={onOpen} /></section></>;
}
function OrderTable({ orders, onOpen, compact = false }: { orders: Order[]; onOpen: (order: Order) => void; compact?: boolean }) {
  if (!orders.length) return <div className="empty"><span>✳</span><strong>Nothing waiting here</strong><p>New requests will show up when a customer places one.</p></div>;
  return <div className="table-scroll"><table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>PLACED</th><th>STATUS</th><th>{compact ? "TOTAL" : "EST. TOTAL"}</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id} onClick={() => onOpen(order)}><td><strong className="order-code">{order.public_code}</strong><small>{order.area_name_snapshot}</small></td><td><strong>{order.recipient_name_snapshot}</strong><small>{order.phone_snapshot}</small></td><td>{dateTime(order.created_at)}</td><td><Status value={order.status} /></td><td className="amount">{money(order.final_total ?? order.estimated_total)}</td><td><span className="row-arrow">↗</span></td></tr>)}</tbody></table></div>;
}
function Status({ value }: { value: string }) { const tone = ["pending_submission", "pending_verification"].includes(value) ? "orange" : value === "awaiting_customer_approval" ? "blue" : ["confirmed", "preparing", "out_for_delivery"].includes(value) ? "green" : value === "delivered" ? "gray" : "red"; return <span className={`status ${tone}`}><i />{human(value)}</span>; }

function OrderDialog({ order, items, deliveryRecords, codPayments, canUpdate, busy, onClose, onRefresh, onMessage, onOperation }: { order: Order; items: OrderItem[]; deliveryRecords: DeliveryRecord[]; codPayments: CodPayment[]; canUpdate: boolean; busy: boolean; onClose: () => void; onRefresh: () => Promise<void>; onMessage: (kind: Notice["kind"], text: string) => void; onOperation: (body: Record<string, unknown>, success: string) => Promise<boolean | undefined> }) {
  const [lines, setLines] = useState<Record<string, { result: string; price: string; alt: string }>>({});
  const [fee, setFee] = useState(String(order.estimated_delivery_fee)); const [eta, setEta] = useState(order.estimated_eta ?? "");
  const [reason, setReason] = useState("");
  useEffect(() => { setLines(Object.fromEntries(items.map((item) => [item.id, { result: item.fulfillment_state === "pending" ? "available" : item.fulfillment_state, price: String(item.final_unit_price ?? item.requested_unit_price), alt: item.fulfilled_name ?? "" }]))); }, [items]);
  const transition = async (nextStatus: string) => { if (!reason.trim() && ["cancelled", "rejected"].includes(nextStatus)) { onMessage("error", "Add a short reason before cancelling or rejecting."); return; } if (await onOperation({ action: "transition", orderId: order.id, nextStatus, reason: reason.trim() || undefined }, `Order moved to ${human(nextStatus)}.`)) { await onRefresh(); onClose(); } };
  const saveQuote = async () => {
    const quoteLines = items.map((item) => ({ orderItemId: item.id, result: lines[item.id]?.result ?? "available", verifiedUnitPrice: Number(lines[item.id]?.price ?? item.requested_unit_price), alternativeName: lines[item.id]?.alt || null }));
    if (quoteLines.some((line) => line.result === "substituted" && !line.alternativeName)) { onMessage("error", "Enter the substitute product name before saving the quote."); return; }
    if (await onOperation({ action: "verify_quote", orderId: order.id, expectedQuoteVersion: order.quote_version, items: quoteLines, deliveryFee: Number(fee), estimatedEta: eta }, "Verified quote sent to the customer for approval.")) { await onRefresh(); onClose(); }
  };
  const assignment = deliveryRecords.find((record) => record.order_id === order.id && ["assigned", "in_transit"].includes(record.status));
  const payment = codPayments.find((record) => record.order_id === order.id);
  const nextAction = order.status === "pending_submission" ? ["pending_verification"] : order.status === "confirmed" ? ["preparing"] : order.status === "preparing" && assignment ? ["out_for_delivery"] : order.status === "out_for_delivery" ? ["delivered"] : [];
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="order-dialog" role="dialog" aria-modal="true" aria-labelledby="order-title">
    <div className="dialog-header"><div><span className="eyebrow green">ORDER DETAILS · {order.public_code}</span><h2 id="order-title">{order.recipient_name_snapshot}</h2><p>{dateTime(order.created_at)} <span>·</span> {order.area_name_snapshot}</p></div><button className="close-button" onClick={onClose} aria-label="Close">×</button></div>
    <div className="dialog-body"><div className="detail-columns"><section className="detail-card"><h3>Customer & delivery</h3><a href={`tel:${order.phone_snapshot}`} className="contact-line"><span>☎</span><div><strong>{order.phone_snapshot}</strong><small>Tap to call customer</small></div></a><div className="address-line"><span>⌖</span><div><strong>{order.address_snapshot}</strong><small>{order.landmark_snapshot ? `${order.landmark_snapshot} · ` : ""}{order.area_name_snapshot}</small></div></div><p className="customer-note">Customer quote decision: <strong>{human(order.customer_decision)}</strong></p>{assignment && <p className="customer-note">Delivery: <strong>{assignment.driver_name}</strong> · {human(assignment.status)}</p>}{order.customer_note && <p className="customer-note">“{order.customer_note}”</p>}</section><section className="detail-card total-card"><h3>Order summary</h3><div><span>Items estimate</span><strong>{money(order.estimated_subtotal)}</strong></div><div><span>Delivery fee</span><strong>{money(order.final_delivery_fee ?? order.estimated_delivery_fee)}</strong></div><div className="total-line"><span>{order.final_total ? "Final total" : "Estimated total"}</span><strong>{money(order.final_total ?? order.estimated_total)}</strong></div><div className="cod-pill">Cash on Delivery · {payment ? human(payment.status) : "not created yet"}</div>{payment && <div><span>Collected / due</span><strong>{money(payment.amount_collected)} / {money(payment.amount_due)}</strong></div>}</section></div>
      <section className="detail-card item-card"><div className="item-heading"><h3>Items & shop verification</h3><Status value={order.status} /></div>{items.map((item) => <div className="verified-item" key={item.id}><div><strong>{item.fulfilled_name || item.requested_name}</strong><small>{item.quantity} × {item.requested_unit_label} · requested {money(item.requested_unit_price)}</small></div><div className="line-total">{money(Number(item.final_unit_price ?? item.requested_unit_price) * item.quantity)}</div>{canUpdate && order.status === "pending_verification" && <div className="verify-fields"><select value={lines[item.id]?.result ?? "available"} onChange={(e) => setLines({ ...lines, [item.id]: { ...lines[item.id], result: e.target.value } })}><option value="available">Available</option><option value="unavailable">Unavailable</option><option value="substituted">Offer substitute</option></select>{lines[item.id]?.result !== "unavailable" && <input aria-label="Verified unit price" type="number" min="0" step="0.01" value={lines[item.id]?.price ?? ""} onChange={(e) => setLines({ ...lines, [item.id]: { ...lines[item.id], price: e.target.value } })} placeholder="Verified price" />}{lines[item.id]?.result === "substituted" && <input aria-label="Alternative item name" value={lines[item.id]?.alt ?? ""} onChange={(e) => setLines({ ...lines, [item.id]: { ...lines[item.id], alt: e.target.value } })} placeholder="Substitute item" />}</div>}</div>)}
       {canUpdate && order.status === "pending_verification" && <div className="quote-fields"><label>Verified delivery fee<input type="number" min="0" step="1" value={fee} onChange={(e) => setFee(e.target.value)} /></label><label>Estimated delivery time<input value={eta} onChange={(e) => setEta(e.target.value)} placeholder="e.g. 45–60 minutes" maxLength={100} /></label><button disabled={busy} className="primary" onClick={() => void saveQuote()}>{busy ? "Saving…" : "Send verified quote for approval →"}</button></div>}
      </section>
      {canUpdate && <div className="detail-card actions-card"><h3>Order actions</h3><p>Backend rules validate every transition; customer approval is required before preparation.</p>{order.status === "pending_submission" && <div className="waiting-banner">This is only a draft until staff receives the customer WhatsApp message. Confirm receipt only after the message arrives.</div>}{order.status === "preparing" && !assignment && <DeliveryAssignmentInline order={order} busy={busy} onOperation={onOperation} onRefresh={onRefresh} onMessage={onMessage} />}{assignment && <div className="waiting-banner">Assigned to {assignment.driver_name} · {assignment.driver_phone_e164}{assignment.status === "in_transit" ? " · currently in transit" : " · ready for dispatch"}</div>}{nextAction.map((next) => <button key={next} className="primary action-button" disabled={busy} onClick={() => void transition(next)}>{order.status === "pending_submission" ? "Confirm WhatsApp message received" : "Mark " + human(next)} <span>→</span></button>)}{order.status === "awaiting_customer_approval" && <><div className="waiting-banner">Waiting for the customer to approve quote {order.quote_version}. Do not begin preparation yet.</div><PhoneOutcome order={order} busy={busy} onOperation={onOperation} onRefresh={onRefresh} onClose={onClose} /></>}{!["cancelled", "rejected", "expired", "delivered"].includes(order.status) && <div className="cancel-controls"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason required to cancel" /><button className="danger-button" disabled={busy} onClick={() => void transition("cancelled")}>Cancel request</button></div>}</div>}
    </div><div className="dialog-footer"><span>Order status is controlled by the secure backend.</span><button className="secondary" onClick={onClose}>Close</button></div>
  </div></div>;
}

function PhoneOutcome({ order, busy, onOperation, onRefresh, onClose }: { order: Order; busy: boolean; onOperation: (body: Record<string, unknown>, success: string) => Promise<boolean | undefined>; onRefresh: () => Promise<void>; onClose: () => void }) {
  const [outcome, setOutcome] = useState("approved"); const [note, setNote] = useState("");
  const record = async () => {
    if (!note.trim()) return;
    if (await onOperation({ action: "phone_outcome", orderId: order.id, quoteVersion: order.quote_version, outcome, note: note.trim() }, "Customer call recorded.")) { await onRefresh(); onClose(); }
  };
  return <div className="phone-outcome"><div className="phone-outcome-head"><div><strong>Record the confirmation call</strong><small>Use this only after sharing the current quote with the customer.</small></div><a href={`tel:${order.phone_snapshot}`} className="call-button">☎ Call</a></div><div className="phone-outcome-controls"><select value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="approved">Customer approved</option><option value="changes_requested">Customer requested changes</option><option value="rejected">Customer declined</option><option value="no_answer">No answer</option><option value="callback_requested">Asked for callback</option></select><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Short call outcome note (required)" /><button className="secondary" disabled={busy || !note.trim()} onClick={() => void record()}>Save call outcome</button></div></div>;
}

function DeliveryAssignmentInline({ order, busy, onOperation, onRefresh, onMessage }: { order: Order; busy: boolean; onOperation: (body: Record<string, unknown>, success: string) => Promise<boolean | undefined>; onRefresh: () => Promise<void>; onMessage: (kind: Notice["kind"], text: string) => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const assign = async () => { if (!name.trim() || !/^\+[1-9]\d{7,14}$/.test(phone)) { onMessage("error", "Enter a delivery person name and E.164 phone number."); return; } if (await onOperation({ action: "assign_delivery", orderId: order.id, driverName: name.trim(), driverPhone: phone }, "Delivery person assigned.")) await onRefresh(); };
  return <div className="assignment-inline"><strong>Assign a delivery person before dispatch</strong><div><input aria-label="Delivery person name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={100} /><input aria-label="Delivery person phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801XXXXXXXXX" /><button className="secondary" disabled={busy} onClick={() => void assign()}>{busy ? "Saving…" : "Assign"}</button></div></div>;
}

function Products({ products, shops, categories, inventory, movements, onSaved, onMessage }: { products: Product[]; shops: Shop[]; categories: Category[]; inventory: { id: string; on_hand: number; reserved: number }[]; movements: Record<string, unknown>[]; onSaved: () => Promise<void>; onMessage: (kind: Notice["kind"], text: string) => void }) {
  const [editing, setEditing] = useState<Product | null>(null); const [stock, setStock] = useState<{ id: string; delta: string } | null>(null); const [query, setQuery] = useState("");
  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  return <><PageTitle eyebrow="CATALOG MANAGEMENT" title="Products & stock" body="Keep product prices, availability and inventory under staff control." action={<button className="primary" onClick={() => setEditing({ id: "", shop_id: shops[0]?.id ?? "", category_id: categories[0]?.id ?? "", sku: "", name: "", description: "", image_path: "", unit_label: "piece", price: 0, is_active: false, is_available: false, track_stock: false })}>＋ Add product</button>} />
    <section className="panel order-list-panel"><div className="table-tools"><div className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a product" /></div><span className="result-count">{products.length} products · low stock ≤ 5 available</span></div><div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>SHOP / CATEGORY</th><th>PRICE</th><th>STOCK</th><th>AVAILABILITY</th><th /></tr></thead><tbody>{filtered.map((p) => { const inv = inventory.find((i) => i.id === p.id); const available = Math.max(0, (inv?.on_hand ?? 0) - (inv?.reserved ?? 0)); return <tr key={p.id}><td><div className="admin-product"><ProductImage path={p.image_path} /><span><strong>{p.name}</strong><small>{p.unit_label}{p.sku ? ` · ${p.sku}` : ""}</small></span></div></td><td><strong>{shops.find((s) => s.id === p.shop_id)?.name ?? "Unknown shop"}</strong><small>{categories.find((c) => c.id === p.category_id)?.name ?? "Uncategorized"}</small></td><td className="amount">{money(p.price)}</td><td>{p.track_stock ? <><span className={available <= 5 ? "low-stock" : ""}>{available} available</span><small>{inv?.on_hand ?? 0} on hand · {inv?.reserved ?? 0} reserved</small></> : <span className="muted">Manual shop check</span>}</td><td><Status value={!p.is_active ? "inactive" : !p.is_available ? "unavailable" : "available"} /></td><td><button className="small-action" onClick={() => setEditing(p)}>Edit</button>{p.track_stock && <button className="small-action" onClick={() => setStock({ id: p.id, delta: "" })}>Adjust</button>}</td></tr>; })}</tbody></table></div>{!shops.length && <div className="setup-note inline-note">Add at least one shop before creating products.</div>}{products.length === 0 && <div className="empty"><strong>No products yet</strong><p>Add a shop and category, then create the first product.</p></div>}</section>
    <section className="panel order-list-panel"><div className="panel-heading"><div><h2>Stock movement history</h2><p>Latest inventory adjustments, reservations and sales</p></div></div>{movements.length ? <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>CHANGE</th><th>TYPE</th><th>REFERENCE / REASON</th><th>DATE</th></tr></thead><tbody>{movements.map((row) => <tr key={String(row.id)}><td>{products.find((p) => p.id === row.product_id)?.name ?? "Product"}</td><td className={Number(row.quantity_delta) < 0 ? "low-stock" : "amount"}>{Number(row.quantity_delta) > 0 ? "+" : ""}{String(row.quantity_delta)}</td><td>{human(String(row.movement_type))}</td><td>{String(row.reason ?? row.order_id ?? "—")}</td><td>{dateTime(String(row.created_at))}</td></tr>)}</tbody></table></div> : <div className="empty compact-empty">No stock movements recorded.</div>}</section>
    {editing && <ProductForm product={editing} shops={shops} categories={categories} onClose={() => setEditing(null)} onMessage={onMessage} onSaved={async () => { setEditing(null); await onSaved(); }} />}
    {stock && <StockForm stock={stock} onClose={() => setStock(null)} onMessage={onMessage} onSaved={async () => { setStock(null); await onSaved(); }} />}
  </>;
}

function ProductImage({ path }: { path: string | null | undefined }) { if (!path || !supabase) return <span className="product-thumb empty-thumb">▧</span>; const src = /^https?:\/\//i.test(path) ? path : supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl; return <img className="product-thumb" src={src} alt="" loading="lazy" />; }
function ProductForm({ product, shops, categories, onClose, onSaved, onMessage }: { product: Product; shops: Shop[]; categories: Category[]; onClose: () => void; onSaved: () => Promise<void>; onMessage: (kind: Notice["kind"], text: string) => void }) {
  const [form, setForm] = useState(product); const [saving, setSaving] = useState(false); const [imageFile, setImageFile] = useState<File | null>(null);
  const save = async (e: FormEvent) => { e.preventDefault(); if (!supabase) return; setSaving(true); let imagePath = form.image_path;
    if (imageFile && (imageFile.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(imageFile.type))) { setSaving(false); onMessage("error", "Choose a JPEG, PNG or WebP image no larger than 5 MB."); return; }
    if (imageFile) { const extension = imageFile.type === "image/png" ? "png" : imageFile.type === "image/webp" ? "webp" : "jpg"; imagePath = `products/${crypto.randomUUID()}.${extension}`; const upload = await supabase.storage.from("product-media").upload(imagePath, imageFile, { contentType: imageFile.type, cacheControl: "3600", upsert: false }); if (upload.error) { setSaving(false); onMessage("error", upload.error.message); return; } }
    const { data, error } = await supabase.functions.invoke("order-operations", { body: { action: "upsert_product", id: form.id || null, shopId: form.shop_id, categoryId: form.category_id, sku: form.sku, name: form.name, description: form.description, imagePath, unitLabel: form.unit_label, price: Number(form.price), isActive: form.is_active, isAvailable: form.is_available, trackStock: form.track_stock } }); setSaving(false); if (error || data?.error) { onMessage("error", data?.error?.message ?? error?.message ?? "Could not save product."); return; } onMessage("success", "Product saved."); await onSaved(); };
  const field = (name: keyof Product, value: unknown) => setForm({ ...form, [name]: value });
  return <div className="modal-backdrop"><form className="form-dialog" onSubmit={(e) => void save(e)}><div className="dialog-header"><div><span className="eyebrow green">CATALOG</span><h2>{product.id ? "Edit product" : "New product"}</h2></div><button type="button" className="close-button" onClick={onClose}>×</button></div><div className="form-grid"><label>Product name<input required maxLength={160} value={form.name} onChange={(e) => field("name", e.target.value)} /></label><label>SKU (optional)<input value={form.sku ?? ""} onChange={(e) => field("sku", e.target.value)} /></label><label>Shop<select required value={form.shop_id} onChange={(e) => field("shop_id", e.target.value)}>{shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Category<select required value={form.category_id} onChange={(e) => field("category_id", e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Price (BDT)<input type="number" min="0" step="0.01" required value={form.price} onChange={(e) => field("price", Number(e.target.value))} /></label><label>Unit label<input required maxLength={50} value={form.unit_label} onChange={(e) => field("unit_label", e.target.value)} /></label><label className="full-field">Description<input value={form.description ?? ""} maxLength={2000} onChange={(e) => field("description", e.target.value)} /></label><label className="full-field">Upload product image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} /><small>JPEG, PNG or WebP · max 5 MB. Stored in the Supabase product-media bucket.</small></label><label className="full-field">Or image path / URL<input value={form.image_path ?? ""} onChange={(e) => field("image_path", e.target.value)} placeholder="products/rice.jpg" /></label></div><div className="toggle-list"><label><input type="checkbox" checked={form.is_active} onChange={(e) => field("is_active", e.target.checked)} /> Active in catalog</label><label><input type="checkbox" checked={form.is_available} onChange={(e) => field("is_available", e.target.checked)} /> Available to order</label><label><input type="checkbox" checked={form.track_stock} onChange={(e) => field("track_stock", e.target.checked)} /> Track stock quantity</label></div><div className="dialog-footer"><span>Price changes and storage uploads require catalog permissions.</span><button className="primary" disabled={saving || !shops.length || !categories.length}>{saving ? "Saving…" : "Save product"}</button></div></form></div>;
}
function StockForm({ stock, onClose, onSaved, onMessage }: { stock: { id: string; delta: string }; onClose: () => void; onSaved: () => Promise<void>; onMessage: (kind: Notice["kind"], text: string) => void }) {
  const [delta, setDelta] = useState(""); const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false);
  const save = async (e: FormEvent) => { e.preventDefault(); if (!supabase) return; setSaving(true); const { data, error } = await supabase.functions.invoke("order-operations", { body: { action: "adjust_inventory", productId: stock.id, quantityDelta: Number(delta), reason } }); setSaving(false); if (error || data?.error) { onMessage("error", data?.error?.message ?? error?.message ?? "Stock adjustment failed."); return; } onMessage("success", "Stock updated and recorded in the ledger."); await onSaved(); };
  return <div className="modal-backdrop"><form className="form-dialog small-dialog" onSubmit={(e) => void save(e)}><div className="dialog-header"><div><span className="eyebrow green">INVENTORY</span><h2>Adjust stock</h2></div><button type="button" className="close-button" onClick={onClose}>×</button></div><label>Quantity change<input autoFocus type="number" required value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. 12 or -3" /></label><label>Reason<input required maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Restock, damage, count correction…" /></label><div className="dialog-footer"><span>Adjustment is audit logged.</span><button className="primary" disabled={saving}>{saving ? "Saving…" : "Record adjustment"}</button></div></form></div>;
}

function Categories({ categories, onSaved, onMessage }: { categories: Category[]; onSaved: () => Promise<void>; onMessage: (kind: Notice["kind"], text: string) => void }) {
  const [form, setForm] = useState<Category | null>(null); const [saving, setSaving] = useState(false);
  const save = async (e: FormEvent) => { e.preventDefault(); if (!supabase || !form) return; setSaving(true); const { data, error } = await supabase.functions.invoke("order-operations", { body: { action: "upsert_category", id: form.id || null, parentId: form.parent_id, name: form.name, slug: form.slug, sortOrder: Number(form.sort_order), isActive: form.is_active } }); setSaving(false); if (error || data?.error) { onMessage("error", data?.error?.message ?? error?.message ?? "Could not save category."); return; } setForm(null); onMessage("success", "Category saved."); await onSaved(); };
  return <><PageTitle eyebrow="CATALOG STRUCTURE" title="Categories" body="Keep the catalog clear and easy to browse." action={<button className="primary" onClick={() => setForm({ id: "", name: "", slug: "", parent_id: null, sort_order: categories.length, is_active: true })}>＋ Add category</button>} /><div className="category-grid">{categories.map((c) => <div className="category-card" key={c.id}><span className="category-symbol">◈</span><div><strong>{c.name}</strong><small>/{c.slug} · order {c.sort_order}</small></div><span className={`tiny-status ${c.is_active ? "on" : "off"}`}>{c.is_active ? "Active" : "Hidden"}</span><button className="small-action" onClick={() => setForm(c)}>Edit</button></div>)}</div>
    {form && <div className="modal-backdrop"><form className="form-dialog small-dialog" onSubmit={(e) => void save(e)}><div className="dialog-header"><div><span className="eyebrow green">CATALOG</span><h2>{form.id ? "Edit category" : "New category"}</h2></div><button type="button" className="close-button" onClick={() => setForm(null)}>×</button></div><label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>URL-friendly slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></label><label>Sort order<input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></label><label className="toggle-check"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Visible in catalog</label><div className="dialog-footer"><span>Only authorized catalog staff can save.</span><button className="primary" disabled={saving}>{saving ? "Saving…" : "Save category"}</button></div></form></div>}
  </>;
}

function Shops({ shops, onSaved, onMessage }: { shops: Shop[]; onSaved: () => Promise<void>; onMessage: (kind: Notice["kind"], text: string) => void }) {
  const [editing, setEditing] = useState<Shop | null>(null);
  return <><PageTitle eyebrow="LOCAL PARTNERS" title="Shops" body="Manage participating market shops and control which partners are visible to customers." action={<button className="primary" onClick={() => setEditing({ id: "", name: "", slug: "", description: "", phone_e164: "", is_active: false })}>＋ Add shop</button>} />
    {shops.length ? <div className="category-grid">{shops.map((shop) => <article className="category-card" key={shop.id}><span className="category-symbol">⌂</span><div><strong>{shop.name}</strong><small>/{shop.slug} · {shop.phone_e164 || "No phone saved"}</small></div><span className={`tiny-status ${shop.is_active ? "on" : "off"}`}>{shop.is_active ? "Active" : "Hidden"}</span><button className="small-action" onClick={() => setEditing(shop)}>Edit</button></article>)}</div> : <div className="empty"><strong>No shops added</strong><p>Add the first participating shop to begin catalog setup.</p></div>}
    {editing && <ShopForm shop={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onSaved(); }} onMessage={onMessage} />}
  </>;
}

function ShopForm({ shop, onClose, onSaved, onMessage }: { shop: Shop; onClose: () => void; onSaved: () => Promise<void>; onMessage: (kind: Notice["kind"], text: string) => void }) {
  const [form, setForm] = useState(shop); const [saving, setSaving] = useState(false);
  const save = async (event: FormEvent) => { event.preventDefault(); if (!supabase) return; setSaving(true); const { data, error } = await supabase.functions.invoke("order-operations", { body: { action: "upsert_shop", id: form.id || null, name: form.name.trim(), slug: form.slug.trim(), description: form.description || null, phone: form.phone_e164 || null, isActive: form.is_active } }); setSaving(false); if (error || data?.error) { onMessage("error", data?.error?.message ?? error?.message ?? "Could not save shop."); return; } onMessage("success", "Shop saved."); await onSaved(); };
  return <div className="modal-backdrop"><form className="form-dialog small-dialog" onSubmit={(event) => void save(event)}><div className="dialog-header"><div><span className="eyebrow green">SHOP PARTNER</span><h2>{form.id ? "Edit shop" : "Add shop"}</h2></div><button type="button" className="close-button" onClick={onClose}>×</button></div><label>Shop name<input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></label><label>Description<input maxLength={2000} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label>Phone (E.164)<input pattern="\+[1-9][0-9]{7,14}" value={form.phone_e164 ?? ""} onChange={(e) => setForm({ ...form, phone_e164: e.target.value })} placeholder="+8801XXXXXXXXX" /></label><label className="toggle-check"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active and visible</label><div className="dialog-footer"><span>Shop changes require admin or catalog manager access.</span><button className="primary" disabled={saving}>{saving ? "Saving…" : "Save shop"}</button></div></form></div>;
}

function Customers({ customers, search, setSearch, offset, setOffset }: { customers: Customer[]; search: string; setSearch: (value: string) => void; offset: number; setOffset: (value: number) => void }) {
  return <><PageTitle eyebrow="CUSTOMER DIRECTORY" title="Customers" body="Customer contact details are loaded through a role-checked, paginated server function." /><section className="panel order-list-panel"><div className="table-tools"><div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" /></div><span className="result-count">Showing {customers.length ? offset + 1 : 0}–{offset + customers.length} matching customers</span></div>{customers.length ? <div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>PHONE</th><th>ORDERS</th><th>LATEST ORDER</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.customer_id}><td><strong>{customer.display_name || "Customer"}</strong></td><td>{customer.phone_e164 ? <a href={`tel:${customer.phone_e164}`}>{customer.phone_e164}</a> : "—"}</td><td>{customer.order_count}</td><td>{customer.latest_order_at ? dateTime(customer.latest_order_at) : "No orders"}</td></tr>)}</tbody></table></div> : <div className="empty"><strong>No matching customers</strong><p>Try a different name or phone number.</p></div>}<div className="pagination-controls"><button className="secondary" disabled={offset===0} onClick={() => setOffset(Math.max(0, offset-100))}>← Previous</button><button className="secondary" disabled={customers.length<100} onClick={() => setOffset(offset+100)}>Next →</button></div></section></>;
}

function Delivery({ orders, records, busy, onOperation, onRefresh }: { orders: Order[]; records: DeliveryRecord[]; busy: boolean; onOperation: (body: Record<string, unknown>, success: string) => Promise<boolean | undefined>; onRefresh: () => Promise<void> }) {
  const eligible = orders.filter((order) => ["confirmed", "preparing"].includes(order.status));
  const active = records.filter((record) => ["assigned", "in_transit"].includes(record.status));
  const [orderId, setOrderId] = useState(eligible[0]?.id ?? ""); const [driverName, setDriverName] = useState(""); const [driverPhone, setDriverPhone] = useState(""); const [notes, setNotes] = useState("");
  useEffect(() => { if (!eligible.some((order) => order.id === orderId)) setOrderId(eligible[0]?.id ?? ""); }, [eligible.map((o) => o.id).join(","), orderId]);
  const assign = async (event: FormEvent) => { event.preventDefault(); if (!orderId) return; if (await onOperation({ action: "assign_delivery", orderId, driverName, driverPhone, notes: notes || null }, "Delivery person assigned.")) { setDriverName(""); setDriverPhone(""); setNotes(""); await onRefresh(); } };
  const transition = async (order: Order, nextStatus: string) => { if (await onOperation({ action: "transition", orderId: order.id, nextStatus }, `Order marked ${human(nextStatus)}.`)) await onRefresh(); };
  return <><PageTitle eyebrow="FULFILMENT" title="Delivery management" body="Assign a delivery person, then dispatch and complete orders through backend-validated transitions." />
    <div className="management-grid"><form className="panel management-form" onSubmit={(event) => void assign(event)}><div className="panel-heading"><div><h2>Assign delivery</h2><p>Only confirmed or preparing orders can be assigned.</p></div></div><label>Order<select required value={orderId} onChange={(e) => setOrderId(e.target.value)}><option value="">Select order</option>{eligible.map((order) => <option value={order.id} key={order.id}>{order.public_code} · {order.recipient_name_snapshot} · {human(order.status)}</option>)}</select></label><label>Delivery person name<input required maxLength={100} value={driverName} onChange={(e) => setDriverName(e.target.value)} /></label><label>Phone number (E.164)<input required pattern="\+[1-9][0-9]{7,14}" placeholder="+8801XXXXXXXXX" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} /></label><label>Note (optional)<input maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></label><button className="primary" disabled={busy || !eligible.length}>{busy ? "Saving…" : "Assign delivery person"}</button>{!eligible.length && <p className="help-muted">No confirmed or preparing order is ready for assignment.</p>}</form>
    <section className="panel"><div className="panel-heading"><div><h2>Active deliveries</h2><p>{active.length} assignment{active.length === 1 ? "" : "s"} in progress</p></div></div>{active.length ? <div className="delivery-list">{active.map((record) => { const order = orders.find((item) => item.id === record.order_id); return <article className="delivery-card" key={record.id}><div><strong>{order?.public_code ?? "Order"} · {order?.recipient_name_snapshot ?? "Customer"}</strong><small>{record.driver_name} · <a href={`tel:${record.driver_phone_e164}`}>{record.driver_phone_e164}</a></small><small>{order?.area_name_snapshot} · Assigned {dateTime(record.assigned_at)}</small></div><Status value={record.status} />{order?.status === "preparing" && record.status === "assigned" && <button className="small-action" disabled={busy} onClick={() => void transition(order, "out_for_delivery")}>Dispatch</button>}{order?.status === "out_for_delivery" && <button className="small-action" disabled={busy} onClick={() => void transition(order, "delivered")}>Delivered</button>}</article>; })}</div> : <div className="empty compact-empty">No active delivery assignments.</div>}</section></div>
    <section className="panel order-list-panel"><div className="panel-heading"><div><h2>Assignment history</h2><p>Previous and completed assignments stay recorded.</p></div></div>{records.length ? <div className="table-scroll"><table><thead><tr><th>ORDER</th><th>DELIVERY PERSON</th><th>PHONE</th><th>STATUS</th><th>ASSIGNED</th><th>COMPLETED</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{orders.find((o) => o.id === record.order_id)?.public_code ?? record.order_id.slice(0, 8)}</td><td>{record.driver_name}</td><td><a href={`tel:${record.driver_phone_e164}`}>{record.driver_phone_e164}</a></td><td><Status value={record.status} /></td><td>{dateTime(record.assigned_at)}</td><td>{record.completed_at ? dateTime(record.completed_at) : "—"}</td></tr>)}</tbody></table></div> : <div className="empty compact-empty">Assignment records will appear here.</div>}</section>
  </>;
}

function Payments({ payments, orders, busy, onOperation, onRefresh, onMessage }: { payments: CodPayment[]; orders: Order[]; busy: boolean; onOperation: (body: Record<string, unknown>, success: string) => Promise<boolean | undefined>; onRefresh: () => Promise<void>; onMessage: (kind: Notice["kind"], text: string) => void }) {
  const [amounts, setAmounts] = useState<Record<string, string>>({}); const [notes, setNotes] = useState<Record<string, string>>({});
  const record = async (payment: CodPayment) => { const amount = Number(amounts[payment.id] ?? payment.amount_due); if (!Number.isFinite(amount) || amount < 0) { onMessage("error", "Enter a valid collected amount."); return; } if (await onOperation({ action: "record_cod", orderId: payment.order_id, amount, note: notes[payment.id] ?? "" }, "COD collection recorded.")) await onRefresh(); };
  return <><PageTitle eyebrow="CASH ON DELIVERY" title="COD payments" body="Record collected amounts and review outstanding COD balances." /><div className="metric-grid"><Metric label="Records" value={payments.length} change="Database payment records" icon="▤" tone="mint" /><Metric label="Collected" value={money(payments.reduce((sum, row) => sum + Number(row.amount_collected), 0))} change="Recorded amount across loaded records" icon="৳" tone="blue" /><Metric label="Outstanding" value={money(payments.filter((p) => ["pending", "exception"].includes(p.status)).reduce((sum, row) => sum + Math.max(0, Number(row.amount_due) - Number(row.amount_collected)), 0))} change="Unpaid balance across loaded records" icon="◷" tone="gold" /></div><section className="panel order-list-panel">{payments.length ? <div className="table-scroll"><table><thead><tr><th>ORDER / CUSTOMER</th><th>DUE</th><th>COLLECTED</th><th>BALANCE</th><th>STATUS</th><th>RECORD COLLECTION</th></tr></thead><tbody>{payments.map((payment) => { const order = orders.find((o) => o.id === payment.order_id); const canCollect = order && ["out_for_delivery", "delivered"].includes(order.status) && payment.status !== "collected"; return <tr key={payment.id}><td><strong>{order?.public_code ?? payment.order_id.slice(0, 8)}</strong><small>{order?.recipient_name_snapshot ?? "Customer"}</small></td><td>{money(payment.amount_due)}</td><td>{money(payment.amount_collected)}</td><td>{money(Math.max(0, Number(payment.amount_due) - Number(payment.amount_collected)))}</td><td><Status value={payment.status} />{payment.collected_at && <small>{dateTime(payment.collected_at)}</small>}</td><td>{canCollect ? <div className="collect-controls"><input aria-label="Amount collected" type="number" min="0" step="0.01" value={amounts[payment.id] ?? String(payment.amount_due)} onChange={(e) => setAmounts({ ...amounts, [payment.id]: e.target.value })} /><input aria-label="Collection note" placeholder="Note (optional)" value={notes[payment.id] ?? ""} onChange={(e) => setNotes({ ...notes, [payment.id]: e.target.value })} /><button className="small-action" disabled={busy} onClick={() => void record(payment)}>Save</button></div> : <span className="muted">{payment.status === "collected" ? "Recorded" : "Available after dispatch"}</span>}</td></tr>; })}</tbody></table></div> : <div className="empty"><strong>No COD records yet</strong><p>COD records are created when the customer approves the verified quote.</p></div>}</section></>;
}

function Reports({ metrics, from, to, setFrom, setTo, onRefresh }: { metrics: DashboardMetrics | null; from: string; to: string; setFrom: (value: string) => void; setTo: (value: string) => void; onRefresh: () => Promise<void> }) {
  return <><PageTitle eyebrow="BUSINESS REPORTS" title="Sales & operations" body="Metrics are aggregated by the database from real orders and COD records." action={<button className="secondary" onClick={() => void onRefresh()}>Refresh report ↻</button>} /><section className="panel report-filter"><label>From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label><label>Through<input type="date" value={to} min={from} max={dateKey()} onChange={(e) => setTo(e.target.value)} /></label><span>Dates follow Bangladesh time. Gross sales count delivered orders only. COD outstanding shows current unpaid balance.</span></section>{metrics ? <><div className="metric-grid"><Metric label="Total orders" value={metrics.total_orders} change="Requests created in period" icon="▤" tone="mint" /><Metric label="Pending orders" value={metrics.pending_orders} change="Awaiting shop/customer action" icon="◷" tone="gold" /><Metric label="In progress" value={metrics.in_progress_orders} change="Confirmed, preparing, or out for delivery" icon="➜" tone="blue" /><Metric label="Completed" value={metrics.completed_orders} change="Delivered in period" icon="✓" tone="blue" /><Metric label="Cancelled / rejected" value={metrics.cancelled_orders} change="Last cancellation update in period" icon="×" tone="coral" /><Metric label="Gross sales" value={money(metrics.gross_sales)} change="Delivered order totals" icon="৳" tone="mint" /><Metric label="COD collected" value={money(metrics.cod_collected)} change="Cash recorded as collected" icon="৳" tone="blue" /><Metric label="Outstanding COD" value={money(metrics.outstanding_cod)} change="Current balance on active/delivered orders" icon="◷" tone="gold" /></div><section className="panel order-list-panel"><div className="panel-heading"><div><h2>Top-selling products</h2><p>Delivered item quantities during the selected period</p></div></div>{metrics.top_products.length ? <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>QUANTITY SOLD</th><th>GROSS ITEM SALES</th></tr></thead><tbody>{metrics.top_products.map((item) => <tr key={item.product_name}><td>{item.product_name}</td><td>{item.quantity_sold}</td><td>{money(item.gross_sales)}</td></tr>)}</tbody></table></div> : <div className="empty compact-empty">No delivered item sales in this period.</div>}</section></> : <div className="empty"><strong>Report data unavailable</strong><p>Refresh after the analytics migration is applied and your staff role is verified.</p></div>}</>;
}

function Staff({ staff, audit, busy, onOperation, onRefresh, onMessage }: { staff: Record<string, unknown>[]; audit: Record<string, unknown>[]; busy: boolean; onOperation: (body: Record<string, unknown>, success: string) => Promise<boolean | undefined>; onRefresh: () => Promise<void>; onMessage: (kind: Notice["kind"], text: string) => void }) {
  const [userId, setUserId] = useState(""); const [role, setRole] = useState("order_operator"); const [displayName, setDisplayName] = useState("");
  const save = async (event: FormEvent) => { event.preventDefault(); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) { onMessage("error", "Enter the existing Supabase Auth user ID (UUID)."); return; } if (await onOperation({ action: "assign_staff_role", userId, role, active: true, displayName }, "Staff role assigned.")) { setUserId(""); setDisplayName(""); await onRefresh(); } };
  const disable = async (id: string, assignedRole: string) => { if (window.confirm("Deactivate this staff profile and remove this role?")) if (await onOperation({ action: "assign_staff_role", userId: id, role: assignedRole, active: false }, "Staff profile deactivated.")) await onRefresh(); };
  return <><PageTitle eyebrow="ACCESS CONTROL" title="Staff & audit" body="Only admins can manage staff roles and inspect administrative change history." /><div className="management-grid"><form className="panel management-form" onSubmit={(event) => void save(event)}><div className="panel-heading"><div><h2>Assign staff access</h2><p>The user must already exist in Supabase Auth.</p></div></div><label>Auth user ID<input required value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label><label>Display name<input maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label><label>Role<select value={role} onChange={(e) => setRole(e.target.value)}><option value="order_operator">Order operator</option><option value="catalog_manager">Catalog manager</option><option value="admin">Admin</option></select></label><button className="primary" disabled={busy}>{busy ? "Saving…" : "Assign role"}</button><p className="help-muted">Create the account through the approved Auth process first. This screen does not create or invite accounts.</p></form><section className="panel order-list-panel"><div className="panel-heading"><div><h2>Current staff</h2><p>{staff.length} role assignment rows</p></div></div>{staff.length ? <div className="table-scroll"><table><thead><tr><th>STAFF</th><th>ROLE</th><th>STATUS</th><th>ASSIGNED</th><th /></tr></thead><tbody>{staff.map((row, index) => <tr key={`${row.user_id}-${row.role}-${index}`}><td><strong>{String(row.display_name || "Staff")}</strong><small>{String(row.email || "")}</small></td><td>{human(String(row.role || "No role"))}</td><td><Status value={Boolean(row.is_active) ? "active" : "inactive"} /></td><td>{row.assigned_at ? dateTime(String(row.assigned_at)) : "—"}</td><td>{Boolean(row.is_active) && <button className="danger-button" disabled={busy} onClick={() => void disable(String(row.user_id), String(row.role ?? "order_operator"))}>Deactivate</button>}</td></tr>)}</tbody></table></div> : <div className="empty compact-empty">No staff records returned.</div>}</section></div>
    <section className="panel order-list-panel"><div className="panel-heading"><div><h2>Administrative audit history</h2><p>Audit entries list changed field names, not stored customer or product values.</p></div></div>{audit.length ? <div className="table-scroll"><table><thead><tr><th>TIME</th><th>ACTOR</th><th>ACTION</th><th>RECORD</th><th>FIELDS</th></tr></thead><tbody>{audit.map((row) => <tr key={String(row.id)}><td>{dateTime(String(row.created_at))}</td><td>{String(row.actor_user_id ?? "System")}</td><td>{human(String(row.action))}</td><td>{String(row.entity_type)} · {String(row.entity_id).slice(0, 12)}</td><td>{Array.isArray(row.changed_fields) ? row.changed_fields.join(", ") || "—" : "—"}</td></tr>)}</tbody></table></div> : <div className="empty compact-empty">No administrative changes recorded.</div>}</section>
  </>;
}

function Notifications({ rows, isAdmin, onRetry }: { rows: Record<string, unknown>[]; isAdmin: boolean; onRetry: (id: string) => void }) {
  const ids = rows.map((row) => String(row.id)); const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  useEffect(() => { if (!supabase || !ids.length) return; void supabase.from("notification_logs").select("id,outbox_id,attempt_number,outcome,provider_message_id,provider_error_code,created_at").in("outbox_id", ids).order("created_at", { ascending: false }).then(({ data }) => setLogs(data ?? [])); }, [ids.join(",")]);
  return <><PageTitle eyebrow="MESSAGE DELIVERY" title="Notifications" body="Review WhatsApp message attempts and retry eligible failures safely." /><div className="notification-summary"><div><strong>{rows.length}</strong><span>outbox jobs</span></div><div><strong>{rows.filter((r) => r.status === "sent").length}</strong><span>accepted by Meta API</span></div><div><strong className="warning-text">{rows.filter((r) => ["dead_letter", "unknown"].includes(String(r.status))).length}</strong><span>need review</span></div></div>
    <section className="panel order-list-panel"><div className="table-scroll"><table><thead><tr><th>EVENT</th><th>RECIPIENT</th><th>CREATED</th><th>ATTEMPTS</th><th>STATUS</th><th>LAST ISSUE</th><th /></tr></thead><tbody>{rows.map((r) => <tr key={String(r.id)}><td><strong>{human(String(r.event_type))}</strong><small>{String(r.template_name)}</small></td><td>{human(String(r.recipient_type))}</td><td>{dateTime(String(r.created_at))}</td><td>{String(r.attempt_count)}</td><td><Status value={String(r.status)} /></td><td className="error-code">{String(r.last_error_code ?? "—")}</td><td>{isAdmin && ["dead_letter", "skipped"].includes(String(r.status)) && <button className="small-action" onClick={() => onRetry(String(r.id))}>Retry</button>}</td></tr>)}</tbody></table></div>{!rows.length && <div className="empty"><span>◉</span><strong>No notifications yet</strong><p>Outbox entries appear after order events are saved.</p></div>}</section>
    <section className="panel log-panel"><div className="panel-heading"><div><h2>Recent delivery log</h2><p>Provider delivery callbacks and worker attempts</p></div></div>{logs.length ? <div className="log-list">{logs.slice(0, 12).map((log) => <div key={String(log.id)}><span className="log-dot" /><strong>{human(String(log.outcome))}</strong><small>Attempt {String(log.attempt_number)} · {String(log.provider_error_code ?? log.provider_message_id ?? "No provider detail")}</small><time>{dateTime(String(log.created_at))}</time></div>)}</div> : <div className="empty compact-empty">No delivery attempts recorded.</div>}</section>
  </>;
}

function Settings({ settings, areas, onSaved, onMessage }: { settings: Record<string, unknown> | null; areas: { id: string; name: string; fee: number; is_active: boolean }[]; onSaved: () => Promise<void>; onMessage: (kind: Notice["kind"], text: string) => void }) {
  const [form, setForm] = useState({ displayName: String(settings?.display_name ?? "Amar Bazar"), supportPhone: String(settings?.support_phone ?? ""), whatsappUrl: String(settings?.support_whatsapp_url ?? ""), ordersEnabled: Boolean(settings?.orders_enabled), codEnabled: Boolean(settings?.cod_enabled), codTolerance: String(settings?.cod_tolerance ?? 0), maxOrderItems: String(settings?.max_order_items ?? 30) });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!settings) return; setForm({ displayName: String(settings.display_name ?? "Amar Bazar"), supportPhone: String(settings.support_phone ?? ""), whatsappUrl: String(settings.support_whatsapp_url ?? ""), ordersEnabled: Boolean(settings.orders_enabled), codEnabled: Boolean(settings.cod_enabled), codTolerance: String(settings.cod_tolerance ?? 0), maxOrderItems: String(settings.max_order_items ?? 30) }); }, [settings]);
  const save = async (e: FormEvent) => { e.preventDefault(); if (!supabase) return; setSaving(true); const { data, error } = await supabase.functions.invoke("order-operations", { body: { action: "update_store_settings", ...form, codTolerance: Number(form.codTolerance), maxOrderItems: Number(form.maxOrderItems), supportPhone: form.supportPhone || null, whatsappUrl: form.whatsappUrl || null } }); setSaving(false); if (error || data?.error) { onMessage("error", data?.error?.message ?? error?.message ?? "Could not update settings."); return; } onMessage("success", "Store settings updated."); await onSaved(); };
  return <><PageTitle eyebrow="STORE CONTROL" title="Store settings" body="Control order intake, customer support details and Cash on Delivery." />
    <div className="settings-layout"><form className="panel settings-form" onSubmit={(e) => void save(e)}><div className="panel-heading"><div><h2>Store profile</h2><p>Visible to customers in the app</p></div></div><label>Store display name<input required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label><label>Support phone (international format)<input pattern="\+[1-9][0-9]{7,14}" value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} placeholder="+8801XXXXXXXXX" /></label><label>Support WhatsApp URL<input type="url" value={form.whatsappUrl} onChange={(e) => setForm({ ...form, whatsappUrl: e.target.value })} placeholder="https://wa.me/..." /></label><div className="settings-divider" /><div className="panel-heading"><div><h2>Order rules</h2><p>Changes take effect immediately for new requests</p></div></div><label className="setting-switch"><span><strong>Accept new order requests</strong><small>Keep disabled until service operations are ready</small></span><input type="checkbox" checked={form.ordersEnabled} onChange={(e) => setForm({ ...form, ordersEnabled: e.target.checked })} /></label><label className="setting-switch"><span><strong>Cash on Delivery</strong><small>Allow COD for confirmed orders</small></span><input type="checkbox" checked={form.codEnabled} onChange={(e) => setForm({ ...form, codEnabled: e.target.checked })} /></label><div className="settings-two"><label>COD tolerance (BDT)<input type="number" min="0" step="0.01" value={form.codTolerance} onChange={(e) => setForm({ ...form, codTolerance: e.target.value })} /></label><label>Maximum products per order<input type="number" min="1" max="100" value={form.maxOrderItems} onChange={(e) => setForm({ ...form, maxOrderItems: e.target.value })} /></label></div><div className="settings-foot"><span>Restricted to an authorized admin role.</span><button className="primary" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button></div></form>
      <div className="settings-side"><section className="panel"><div className="panel-heading"><div><h2>Delivery areas</h2><p>Current configured coverage</p></div><span className="count-chip">{areas.filter((a) => a.is_active).length} active</span></div><div className="area-list">{areas.map((a) => <div key={a.id}><span className={a.is_active ? "area-dot active" : "area-dot"} /><strong>{a.name}</strong><span>{money(a.fee)}</span></div>)}</div><small className="help-muted">Village coverage is managed in the database; have the owner verify fee values before enabling orders.</small></section><section className="security-note"><span>◈</span><div><strong>Keep secrets out of the dashboard</strong><p>WhatsApp API tokens, webhook secrets and the Supabase service-role key belong only in server-side function secrets.</p></div></section></div></div>
  </>;
}

