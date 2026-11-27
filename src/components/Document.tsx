import type { Config } from "../shared/model";
export function Document({ doc }: { doc: Config["documents"][number] }) {
  return (
    <article className="paper">
      <div className="paper-brand">
        <span className="seal">
          {doc.issuer
            .split(" ")
            .map((w) => w[0])
            .slice(0, 3)
            .join("")}
        </span>
        <div>
          <b>{doc.issuer}</b>
          <small>Administrative & financial services</small>
        </div>
      </div>
      <hr />
      <div className="paper-title">
        <h1>{doc.title}</h1>
        <span>{doc.reference}</span>
      </div>
      <dl>
        <dt>Issued to</dt>
        <dd>{doc.name}</dd>
        <dt>Period</dt>
        <dd>November 2026</dd>
      </dl>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount / status</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l, i) => (
            <tr key={i}>
              <td>{l.label}</td>
              <td>{l.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="paper-note">
        Please retain this statement for your records.
        <br />
        For inquiries, contact the administrative office.
      </div>
      <div className="signature">Authorized representative</div>
      <footer>
        {doc.issuer} · Records Department
        <br />
        Fictional document · Film production use only
      </footer>
    </article>
  );
}
