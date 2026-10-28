import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const blocked = new BlockList();

blocked.addSubnet("0.0.0.0", 8, "ipv4");
blocked.addSubnet("10.0.0.0", 8, "ipv4");
blocked.addSubnet("100.64.0.0", 10, "ipv4");
blocked.addSubnet("127.0.0.0", 8, "ipv4");
blocked.addSubnet("169.254.0.0", 16, "ipv4");
blocked.addSubnet("172.16.0.0", 12, "ipv4");
blocked.addSubnet("192.0.0.0", 24, "ipv4");
blocked.addSubnet("192.0.2.0", 24, "ipv4");
blocked.addSubnet("192.168.0.0", 16, "ipv4");
blocked.addSubnet("198.18.0.0", 15, "ipv4");
blocked.addSubnet("198.51.100.0", 24, "ipv4");
blocked.addSubnet("203.0.113.0", 24, "ipv4");
blocked.addSubnet("224.0.0.0", 4, "ipv4");
blocked.addSubnet("240.0.0.0", 4, "ipv4");

blocked.addAddress("::", "ipv6");
blocked.addAddress("::1", "ipv6");
blocked.addSubnet("fc00::", 7, "ipv6");
blocked.addSubnet("fe80::", 10, "ipv6");
blocked.addSubnet("ff00::", 8, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set(["", "80", "443"]);
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
]);
const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal"];

function isBlockedAddress(address: string): boolean {
  const normalized = address.toLowerCase();

  if (
    normalized.startsWith("::ffff:") ||
    normalized.startsWith("0:0:0:0:0:ffff:")
  ) {
    return true;
  }

  const family = isIP(address);

  if (family === 4) {
    return blocked.check(address, "ipv4");
  }

  if (family === 6) {
    return blocked.check(address, "ipv6");
  }

  return true;
}

export async function assertSafeHttpUrl(input: string): Promise<URL> {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error("Only http and https URLs are allowed");
  }

  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    throw new Error("Only ports 80 and 443 are allowed");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new Error("Private hostnames are not allowed");
  }

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new Error("Private or reserved IP addresses are not allowed");
    }

    return url;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });

  if (addresses.length === 0) {
    throw new Error("Hostname did not resolve");
  }

  for (const { address } of addresses) {
    if (isBlockedAddress(address)) {
      throw new Error("Hostname resolves to a private or reserved address");
    }
  }

  return url;
}
