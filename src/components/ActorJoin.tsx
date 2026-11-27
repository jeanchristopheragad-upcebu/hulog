import { useState } from "react";
import { read } from "../services/storage";
type ActorCredentials = {
  code: string;
  role: string;
  preset: "phone" | "laptop";
};
export function ActorJoin({
  joined,
  onJoin,
}: {
  joined: boolean;
  onJoin: (code: string, role: string, preset: "phone" | "laptop") => void;
}) {
  const [code, setCode] = useState(
    new URLSearchParams(location.search).get("session") ||
      read<ActorCredentials | null>("actor", null)?.code ||
      "",
  );
  const [role, setRole] = useState(
    read<ActorCredentials | null>("actor", null)?.role || "Tala’s Smartphone",
  );
  const [preset, setPreset] = useState<"phone" | "laptop">(
    read<ActorCredentials | null>("actor", null)?.preset || "phone",
  );
  return (
    <details open={!joined}>
      <summary>
        {joined
          ? "Device connected · connection settings"
          : "Connect a filming device"}
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onJoin(code, role, preset);
        }}
      >
        <label>
          Session code
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </label>
        <label>
          Unique device role
          <input
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </label>
        <label>
          Display preset
          <select
            aria-label="Display preset"
            value={preset}
            onChange={(e) => setPreset(e.target.value as "phone" | "laptop")}
          >
            <option value="phone">Smartphone</option>
            <option value="laptop">Laptop</option>
          </select>
        </label>
        <button className="primary">Connect device</button>
      </form>
    </details>
  );
}
