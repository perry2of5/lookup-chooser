import { useMemo, useState } from "react";
import { LookupInput } from "../components/LookupInput";
import type { LookupInputValue } from "../services/LookupService";
import { StubLookupService } from "../services/StubLookupService";

export function ConnectionFormPage() {
  const lookupService = useMemo(() => new StubLookupService(), []);

  const [host, setHost] = useState<LookupInputValue>({ source: "manual", value: "" });
  const [port, setPort] = useState<LookupInputValue>({ source: "manual", value: "" });
  const [username, setUsername] = useState<LookupInputValue>({ source: "manual", value: "" });
  const [password, setPassword] = useState<LookupInputValue>({ source: "manual", value: "" });

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-6 border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">Connection Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter values directly or select from lookup-backed values.
          </p>
        </header>

        <div className="space-y-4">
          <LookupInput
            id="host"
            label="Host"
            placeholder="example.internal"
            hint={{ valueType: "text", categoryAllowList: ["general"], targetAllowList: ["host-connection-1", "host-connection-2"] }}
            value={host}
            lookupService={lookupService}
            onChange={setHost}
          />

          <LookupInput
            id="port"
            label="Port"
            placeholder="22"
            hint={{ valueType: "number", categoryAllowList: ["general"], targetAllowList: ["host-connection-1", "host-connection-2"] }}
            value={port}
            lookupService={lookupService}
            onChange={setPort}
          />

          <LookupInput
            id="username"
            label="Username"
            placeholder="service-account"
            hint={{ valueType: "text", categoryAllowList: ["secrets"], targetAllowList: ["secret-name-1", "s3secret", "client-ssh-server"] }}
            value={username}
            lookupService={lookupService}
            onChange={setUsername}
          />

          <LookupInput
            id="password"
            label="Password"
            placeholder="Use lookup for secret values"
            hint={{ valueType: "password", categoryAllowList: ["secrets"], targetAllowList: ["secret-name-1", "s3secret", "client-ssh-server"] }}
            value={password}
            lookupService={lookupService}
            onChange={setPassword}
          />
        </div>
      </section>
    </main>
  );
}
