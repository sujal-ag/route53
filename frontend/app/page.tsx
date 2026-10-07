"use client";

import { FormEvent, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
type Zone = { id: number; name: string; zone_type: string; description: string };
type RecordItem = { id: number; name: string; record_type: string; value: string; ttl: number };

export default function Home() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [zoneName, setZoneName] = useState("");
  const [record, setRecord] = useState({ name: "", record_type: "A", value: "", ttl: "300" });
  const [notice, setNotice] = useState("");

  const loadZones = async () => setZones(await fetch(`${API}/zones`).then((r) => r.json()));
  const loadRecords = async (zone: Zone) => setRecords(await fetch(`${API}/zones/${zone.id}/records`).then((r) => r.json()));
  useEffect(() => { loadZones(); }, []);

  async function addZone(event: FormEvent) {
    event.preventDefault();
    if (!zoneName.trim()) return;
    const response = await fetch(`${API}/zones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: zoneName }) });
    const created = await response.json();
    setZones([...zones, created]); setZoneName(""); setNotice("Hosted zone created");
  }
  async function addRecord(event: FormEvent) {
    event.preventDefault();
    if (!selected || !record.name || !record.value) return;
    await fetch(`${API}/zones/${selected.id}/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...record, ttl: Number(record.ttl) }) });
    await loadRecords(selected); setRecord({ name: "", record_type: "A", value: "", ttl: "300" }); setNotice("Record created");
  }
  async function removeZone(zone: Zone) {
    await fetch(`${API}/zones/${zone.id}`, { method: "DELETE" }); setZones(zones.filter((item) => item.id !== zone.id));
    if (selected?.id === zone.id) { setSelected(null); setRecords([]); }
  }
  async function removeRecord(item: RecordItem) {
    await fetch(`${API}/records/${item.id}`, { method: "DELETE" }); if (selected) loadRecords(selected);
  }

  return <main>
    <header><div className="brand"><span className="aws">aws</span><span>Route 53</span></div><div className="search">⌕ <span>Search</span></div><div className="account">N. Virginia ▾ &nbsp; <b>Demo User</b> ▾</div></header>
    <aside><div className="sideTitle">Route 53</div>{["Dashboard", "Hosted zones", "Traffic policies", "Health checks", "Resolver", "Profiles"].map((item) => <div className={item === "Hosted zones" ? "nav active" : "nav"} key={item}>{item}</div>)}<div className="sideBottom">© 2026, Mock AWS Console<br/>Privacy · Terms</div></aside>
    <section className="content"><div className="crumb">Route 53 <span>›</span> Hosted zones</div><div className="heading"><div><h1>Hosted zones</h1><p>Manage the hosted zones for your domains.</p></div><button className="primary" onClick={() => document.getElementById("new-zone")?.focus()}>Create hosted zone</button></div>
      {notice && <div className="notice">✓ {notice}<button onClick={() => setNotice("")}>×</button></div>}
      <div className="panel"><div className="panelHead"><h2>Hosted zones <small>({zones.length})</small></h2><input placeholder="Filter hosted zones" /></div><table><thead><tr><th>Name</th><th>Type</th><th>Description</th><th></th></tr></thead><tbody>{zones.map((zone) => <tr key={zone.id}><td><button className="link" onClick={() => { setSelected(zone); loadRecords(zone); }}>{zone.name}</button></td><td>{zone.zone_type}</td><td>{zone.description || "—"}</td><td><button className="delete" onClick={() => removeZone(zone)}>Delete</button></td></tr>)}</tbody></table><form className="inlineForm" onSubmit={addZone}><input id="new-zone" value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="domain.example.com" /><button className="secondary">Add zone</button></form></div>
      {selected && <div className="panel"><div className="panelHead"><div><h2>Records for {selected.name}</h2><small>DNS records in this hosted zone</small></div></div><table><thead><tr><th>Name</th><th>Type</th><th>Value</th><th>TTL</th><th></th></tr></thead><tbody>{records.map((item) => <tr key={item.id}><td>{item.name}</td><td><span className="badge">{item.record_type}</span></td><td className="mono">{item.value}</td><td>{item.ttl}</td><td><button className="delete" onClick={() => removeRecord(item)}>Delete</button></td></tr>)}</tbody></table><form className="recordForm" onSubmit={addRecord}><input value={record.name} onChange={(e) => setRecord({ ...record, name: e.target.value })} placeholder="Record name" /><select value={record.record_type} onChange={(e) => setRecord({ ...record, record_type: e.target.value })}>{["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"].map((type) => <option key={type}>{type}</option>)}</select><input value={record.value} onChange={(e) => setRecord({ ...record, value: e.target.value })} placeholder="Value" /><input className="ttl" value={record.ttl} onChange={(e) => setRecord({ ...record, ttl: e.target.value })} placeholder="TTL" /><button className="secondary">Create record</button></form></div>}
    </section>
  </main>;
}
