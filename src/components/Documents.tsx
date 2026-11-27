import { useState, useRef } from "react";
import type { Config } from "../shared/model";
import { Document } from "./Document";
import { exportPDF, exportPNG } from "../services/export";
export function Documents({
  config,
  update,
  report,
}: {
  config: Config;
  update: (c: Config) => void;
  report: (e: unknown) => void;
}) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const doc = config.documents[index];
  const edit = (patch: Partial<typeof doc>) =>
    update({
      ...config,
      documents: config.documents.map((d, i) =>
        i === index ? { ...d, ...patch } : d,
      ),
    });
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow red">FINANCIAL PROPS</p>
          <h1>
            Document library<span className="red-period">.</span>
          </h1>
          <p>Print-ready statements for the world of HULOG.</p>
        </div>
        <div className="button-row">
          <button onClick={() => window.print()}>Print A4</button>
          <button
            onClick={() =>
              ref.current && exportPDF(ref.current, doc.id).catch(report)
            }
          >
            Export PDF
          </button>
          <button
            onClick={() =>
              ref.current && exportPNG(ref.current, doc.id).catch(report)
            }
          >
            Export PNG
          </button>
        </div>
      </div>
      <div className="document-layout">
        <section className="panel document-editor">
          <label>
            Document
            <select value={index} onChange={(e) => setIndex(+e.target.value)}>
              {config.documents.map((d, i) => (
                <option key={d.id} value={i}>
                  {d.title}
                </option>
              ))}
            </select>
          </label>
          {(["title", "issuer", "name", "reference"] as const).map((k) => (
            <label key={k}>
              {k}
              <input
                value={doc[k]}
                onChange={(e) => edit({ [k]: e.target.value })}
              />
            </label>
          ))}
          {doc.lines.map((l, i) => (
            <div className="form-grid" key={i}>
              <label>
                Description
                <input
                  value={l.label}
                  onChange={(e) =>
                    edit({
                      lines: doc.lines.map((x, j) =>
                        i === j ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Value
                <input
                  value={l.value}
                  onChange={(e) =>
                    edit({
                      lines: doc.lines.map((x, j) =>
                        i === j ? { ...x, value: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
        </section>
        <div ref={ref} className="print-document">
          <Document doc={doc} />
        </div>
      </div>
    </>
  );
}
