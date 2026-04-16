<final-text>
Root cause

- This is not failing because of the Worker logic. In `supabase/functions/sync-vanity-dns/index.ts`, the Worker already strips `www.` and redirects correctly, and the sync logs show the `WWW page rule` was created.
- I confirmed `http://www.build.vanity.box` reaches the same UD destination as `build.vanity.box`, which means the DNS + redirect logic is working.
- The failure is on `https://www.build.vanity.box` specifically: the TLS certificate handshake is failing before Cloudflare can run the redirect rule or Worker.
- Cloudflare’s docs say Universal SSL only covers the root domain and first-level subdomains like `build.vanity.box`. It does not cover deeper subdomains like `www.build.vanity.box`.

What this means

```text
https://www.build.vanity.box
  -> TLS handshake at Cloudflare
  -> no valid cert for this multi-level host
  -> request dies before redirect logic runs

http://www.build.vanity.box
  -> request reaches Cloudflare
  -> www-stripping redirect runs
  -> final redirect to https://ud.me/build.vanity works
```

Plan to fix

1. Keep the current redirect Worker and `www` redirect rule; they are not the main problem.
2. Update `sync-vanity-dns` so it checks Cloudflare certificate coverage before claiming `www.*.vanity.box` works.
3. Add support to verify and, if available on your Cloudflare plan, enable the certificate feature needed for deep subdomains (`www.<name>.vanity.box`) so current and future names work automatically.
4. If that certificate feature is not available, make the function return a clear infrastructure error instead of a false success message.
5. Re-run the sync and verify both:
   - `https://build.vanity.box`
   - `https://www.build.vanity.box`

Technical notes

- The existing `*.*.vanity.box` DNS record is not enough by itself.
- The existing Worker route limitation was already worked around correctly with the separate `www` redirect rule.
- The missing piece is HTTPS certificate coverage for second-level subdomains.
- The scalable Cloudflare-side fix is enabling certificate coverage for all proxied deep subdomains; otherwise `www.*.vanity.box` will keep failing on HTTPS no matter how correct the redirect code is.

If you approve, I’ll update the sync flow so it validates the certificate layer and only reports `www.*` support when HTTPS is actually covered.
</final-text>