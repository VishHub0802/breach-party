import type { Question } from "./questions";
// Server-only technical bank. Question indexes stay stable within each difficulty.
// Concepts reviewed against OWASP, MITRE ATT&CK, CISA, AWS documentation, and IETF RFCs.
export const hardQuestions: Question[] = [
  {
    category:"Spot the trap",title:"The query that changed",artifactLabel:"APP TRACE · DATABASE",
    artifact:"A login handler concatenates a submitted username into SQL. A request containing a quote and a true OR condition changes the query's WHERE clause instead of being treated as a username.",
    prompt:"Which vulnerability does this demonstrate?",
    options:["SQL injection caused by mixing data with query syntax","Cross-site request forgery caused by a missing CSRF token","Broken authentication caused only by a weak password policy"],correct:0,
    explanation:"SQL injection lets input alter a database command. Bind values with parameterized queries so input remains data; password policy and CSRF defenses do not fix this query construction.",concept:"SQL injection"
  },
  {
    category:"Spot the trap",title:"The preview proxy",artifactLabel:"HTTP TRACE · URL FETCHER",
    artifact:"A link-preview API fetches any URL supplied by a visitor. Logs show the server requesting http://169.254.169.254/latest/meta-data/ after a user submits that address. The server can reach the cloud metadata service.",
    prompt:"What risk should you investigate first?",
    options:["Server-side request forgery reaching internal metadata","Cross-site scripting executed in the visitor's browser","DNS cache poisoning at the public resolver"],correct:0,
    explanation:"SSRF makes a server request a destination chosen by an attacker. Internal metadata may expose credentials. Restrict destinations and network egress, account for redirects and DNS resolution, and protect the metadata service.",concept:"SSRF"
  },
  {
    category:"Spot the trap",title:"One invoice too many",artifactLabel:"API TRACE · OBJECT ACCESS",
    artifact:"An authenticated customer requests /api/invoices/1048. Changing the ID to 1049 returns another customer's invoice. The session is valid, but the server never checks who owns the requested invoice.",
    prompt:"Which control is missing?",
    options:["Server-side authorization for each requested invoice","Encryption of the invoice ID in the browser","A longer session timeout for authenticated users"],correct:0,
    explanation:"Authentication identifies the caller; authorization decides which objects they may access. Check ownership or permission on every request. Hiding identifiers is not a substitute.",concept:"Broken object-level authorization"
  },
  {
    category:"Spot the trap",title:"Signed for someone else",artifactLabel:"JWT CLAIMS · API GATEWAY",
    artifact:"The Payroll API validates a JWT's signature, issuer, and expiration. Its aud claim is reporting-api, but Payroll still accepts it. Both APIs trust the same issuer's signing key.",
    prompt:"Which validation would prevent this token mix-up?",
    options:["Reject tokens whose audience does not identify the Payroll API","Decode the JWT payload a second time before accepting it","Accept any signed token as long as its subject names an employee"],correct:0,
    explanation:"A valid signature does not make a token valid for every service. Validate the expected audience as well as signature, issuer, time claims, and the application's other requirements.",concept:"JWT audience validation"
  },
  {
    category:"Spot the trap",title:"The encoded DNS trail",artifactLabel:"DNS LOG · ENDPOINT",
    artifact:"A new process sends thousands of DNS queries containing long, encoded-looking subdomain labels to one unfamiliar domain. Query volume jumps sharply, without a matching increase in normal web traffic.",
    prompt:"Which hypothesis best fits these indicators?",
    options:["Possible DNS tunneling for command traffic or data transfer","A confirmed ransomware attack solely because DNS volume is high","An ordinary certificate renewal that needs no investigation"],correct:0,
    explanation:"Long encoded labels and unusual query patterns can indicate DNS tunneling. Correlate the process, destination, and payload before concluding what was transferred; the pattern alone is not proof.",concept:"DNS tunneling"
  },
  {
    category:"Spot the trap",title:"The ACK shortcut",artifactLabel:"FIREWALL RULE · TCP",
    artifact:"A stateless filter permits inbound TCP packets whenever ACK is set. It keeps no connection table. An unsolicited packet with ACK set passes even though no session was established.",
    prompt:"Why did this rule fail to prove the traffic was a reply?",
    options:["An ACK flag alone does not prove membership in an established connection","ACK flags are protected by TLS in every TCP connection","A source port below 1024 guarantees the sender is trusted"],correct:0,
    explanation:"Packet flags can be set without a valid prior session. A stateful firewall tracks connections and checks whether traffic matches permitted state; a stateless ACK rule cannot do that.",concept:"Stateful versus stateless filtering"
  },
  {
    category:"Stop the breach",title:"Hashes on the move",artifactLabel:"EDR ALERT · CREDENTIAL ACCESS",
    artifact:"EDR detects an LSASS memory dump on a Windows workstation. Soon afterward, that workstation initiates unexpected NTLM logons to several servers using a privileged account.",
    prompt:"Which response best contains the suspected lateral movement?",
    options:["Isolate the endpoint, investigate remote sessions, and coordinate rotation of exposed credentials","Change only the workstation's local username and leave its network access intact","Block inbound internet traffic while allowing the same account to keep accessing servers"],correct:0,
    explanation:"Credential dumping followed by unusual NTLM logons warrants investigation for stolen credentials or pass-the-hash activity. Contain the endpoint and affected sessions, preserve evidence, and secure the exposed identities.",concept:"Credential theft and lateral movement"
  },
  {
    category:"Stop the breach",title:"The published access key",artifactLabel:"CLOUD AUDIT · IAM",
    artifact:"A long-lived cloud access key was committed to a public repository. Audit logs show API calls from an unfamiliar address. The key is still active and belongs to a deployment identity.",
    prompt:"Which response actually cuts off this credential?",
    options:["Deactivate the key, replace dependent credentials, and investigate its API activity","Remove the latest commit but leave the key active to avoid downtime","Require MFA on the owner's console login and assume the API key is now safe"],correct:0,
    explanation:"Removing a secret from a repository does not revoke copied credentials. Disable the exposed key, replace it safely, and investigate its use. Console MFA alone does not invalidate a long-lived API key.",concept:"Cloud credential containment"
  },
  {
    category:"Stop the breach",title:"A token outlives the reset",artifactLabel:"IDENTITY LOG · REFRESH TOKEN",
    artifact:"An attacker stole a refresh token. The user resets their password, but this provider does not automatically revoke existing tokens on password reset. The identity platform supports token and session revocation.",
    prompt:"What additional response is needed?",
    options:["Revoke the affected tokens and sessions through the identity platform and investigate account use","Wait until the user's next interactive sign-in before taking any action","Remove the browser's saved password and assume the stolen token stops working"],correct:0,
    explanation:"A password reset may leave issued tokens usable. Use the provider's supported revocation controls and investigate exposure. Access-token invalidation behavior varies, so verify that affected access has ended.",concept:"Token and session revocation"
  },
  {
    category:"Stop the breach",title:"The public storage policy",artifactLabel:"S3 POLICY · DATA EXPOSURE",
    artifact:"An Amazon S3 bucket with customer exports grants anonymous reads through a public bucket policy. The exports should be available only to an internal processing role.",
    prompt:"Which change directly addresses the exposure?",
    options:["Remove public grants, enable appropriate S3 Block Public Access controls, and audit access","Rename the bucket so its URL is harder to guess","Enable encryption at rest while keeping anonymous reads enabled"],correct:0,
    explanation:"Encryption at rest does not fix an authorization policy that allows public reads. Remove public access, apply the relevant blocking controls, retain required role access, and investigate the exposure.",concept:"Cloud storage authorization"
  },
  {
    category:"Stop the breach",title:"The backup is in reach",artifactLabel:"INCIDENT LOG · RANSOMWARE",
    artifact:"Multiple endpoints are encrypting files. Their service account can write to the live backup share. An isolated, immutable backup copy also exists, but its recovery integrity has not yet been checked.",
    prompt:"Which response best protects recovery?",
    options:["Contain affected systems and backup access, preserve evidence, then validate a clean restore path","Mount the immutable copy on an infected endpoint to test it immediately","Restore the live share while leaving the compromised service account enabled"],correct:0,
    explanation:"Contain the attack and protect backup access before recovery. Validate known-clean backups and remove the compromise before reconnecting restored systems; an infected restore environment can undermine recovery.",concept:"Ransomware recovery isolation"
  },
  {
    category:"Stop the breach",title:"The web worker's child",artifactLabel:"EDR TRACE · WEB SERVER",
    artifact:"The IIS worker w3wp.exe unexpectedly launches cmd.exe. A new, unauthorized .aspx file appeared in an upload directory minutes earlier. The server still receives external requests.",
    prompt:"What response fits a suspected web shell?",
    options:["Isolate the affected server, preserve evidence, and investigate the uploaded file, entry point, and exposed secrets","Restart IIS and leave the uploaded file in place if the alert disappears","Patch the operating system and assume the application's persistence is removed"],correct:0,
    explanation:"An unexpected web-worker child process and unauthorized server-side file can indicate a web shell. Contain and investigate, remove the entry point and persistence, and recover from a trusted state.",concept:"Web shell persistence"
  },
  {
    category:"Build the shield",title:"Bind it, don't build it",artifactLabel:"CODE REVIEW · DATABASE ACCESS",
    artifact:"A search endpoint creates SQL by concatenating a visitor's text into the query. A developer proposes escaping quotes in browser JavaScript before sending the request.",
    prompt:"Which server-side change is the strongest primary fix?",
    options:["Use a parameterized query and bind the search value separately","Keep concatenation and trust the browser's quote escaping","Base64-encode the search value and concatenate the decoded value"],correct:0,
    explanation:"Parameterized queries separate values from SQL syntax. Browser checks can be bypassed, and encoding does not make concatenated input safe. Validate allowed inputs as an additional control.",concept:"Parameterized queries"
  },
  {
    category:"Build the shield",title:"A fast hash is too fast",artifactLabel:"DESIGN REVIEW · PASSWORD STORAGE",
    artifact:"A new login service proposes storing SHA-256(password) without a salt. The threat model includes attackers stealing the password database and attempting offline guesses.",
    prompt:"Which design better resists offline password guessing?",
    options:["Use Argon2id with a unique salt per password and appropriately tuned cost parameters","Apply unsalted SHA-256 twice because two fast hashes stop GPU guessing","Store reversible Base64 values so password recovery is easier"],correct:0,
    explanation:"A password-hashing function such as Argon2id makes guesses more expensive. Unique salts prevent shared precomputed results across users. Fast general-purpose hashes and reversible encodings are not suitable password storage.",concept:"Password hashing and salting"
  },
  {
    category:"Build the shield",title:"The routed guest VLAN",artifactLabel:"NETWORK PLAN · INTER-VLAN ACCESS",
    artifact:"Guest Wi-Fi uses VLAN 30 and Payroll uses VLAN 10. The router currently permits all traffic between both VLANs. Guests need internet access but no access to internal systems.",
    prompt:"Which control makes the intended boundary effective?",
    options:["Enforce firewall or ACL rules denying guest access to internal networks while allowing required internet traffic","Change the VLAN numbers and keep unrestricted inter-VLAN routing","Hide the guest SSID and leave all routing permissions unchanged"],correct:0,
    explanation:"Separate VLANs are not enough when routing permits unrestricted access. Enforce the boundary with firewall or ACL policy and test the required permitted and denied paths.",concept:"Network segmentation enforcement"
  },
  {
    category:"Build the shield",title:"Stop the code relay",artifactLabel:"AUTH DESIGN · ADMIN SIGN-IN",
    artifact:"A phishing proxy can relay passwords and one-time codes to the real service. You want an MFA method that cryptographically binds authentication to the legitimate service's domain.",
    prompt:"Which option best meets this requirement?",
    options:["FIDO2/WebAuthn authentication using a security key or suitable passkey","SMS codes with a longer expiration window","TOTP codes copied into any page that displays the company's logo"],correct:0,
    explanation:"FIDO/WebAuthn binds authentication to the legitimate relying party, helping resist credential relay to a phishing origin. SMS and TOTP codes can still be relayed by a phishing proxy.",concept:"Phishing-resistant authentication"
  },
  {
    category:"Build the shield",title:"Both sides need an identity",artifactLabel:"SERVICE DESIGN · TLS",
    artifact:"A payment service verifies the API server's TLS certificate. The API also needs certificate-based proof that an approved payment service is the client, before granting application access.",
    prompt:"Which approach adds that client authentication?",
    options:["Use mutual TLS with client and server certificate validation, plus application authorization","Use server-only TLS and treat any encrypted client connection as trusted","Disable certificate validation because encryption already proves the peer's identity"],correct:0,
    explanation:"Mutual TLS lets each side authenticate the other's certificate. Validate certificates and map client identity to appropriate authorization; encryption alone does not establish permission.",concept:"Mutual TLS"
  },
  {
    category:"Build the shield",title:"A smaller deployment role",artifactLabel:"CI POLICY · LEAST PRIVILEGE",
    artifact:"A CI job uploads release files to one S3 bucket prefix. It needs no IAM administration. Its current policy allows every action on every resource with a long-lived key stored in CI.",
    prompt:"Which replacement best follows least privilege?",
    options:["Use a scoped role with only required bucket-prefix actions and short-lived federated credentials","Keep administrator access but rename the key to deployment-only","Keep wildcard permissions and rely solely on a private repository"],correct:0,
    explanation:"Scope actions and resources to the job's needs. Federated role credentials reduce reliance on long-lived secrets. A key's name or repository visibility does not limit its permissions.",concept:"IAM least privilege"
  },
];
