# Shipwright: keyword map

Every page gets one main keyword and one clear search intent.

**Where the keywords come from.** 150 calls to Google autocomplete (`scripts/keyword-seeds.mjs`) gave 556 unique
suggestions, saved in `keywords/autocomplete.json`. I kept only the ones that fit our product and dropped the noise
(for example "restless leg syndrome", "love bonito", "love field security"). No "People also ask" or Reddit data is in
here yet: add those rows by hand.

**Not in here, on purpose.** Search volume and difficulty. Fill the volume column from Keyword Planner. Nothing below is a
number I made up.

**Intent** (my judgment, check it in the real search results): *Learn* = wants an explanation. *Fix* = has the problem now.
*Tool* = wants a scanner or checker. *Hire* = wants a person. **★** = one of the 20 for the Day 24 `/checks` pages.

## Clusters

### 1. Lovable security

| Keyword | Intent | Source | Volume range | Target page | Status |
|---------|--------|--------|--------------|-------------|--------|
| lovable security scanner | Tool | autocomplete | | / | candidate |
| lovable security check | Tool | autocomplete | | /demo | candidate |
| lovable security report | Tool | autocomplete | | /demo | candidate |
| lovable security issues | Learn | autocomplete | | /blog | candidate |
| lovable security risks | Learn | autocomplete | | /blog | candidate |
| lovable security review | Learn | autocomplete | | /blog | candidate |
| lovable security problems | Fix | autocomplete | | /blog | candidate |
| is lovable app secure | Learn | autocomplete | | /ask | candidate |
| how secure is lovable | Learn | autocomplete | | /ask | candidate |
| ★ lovable row level security | Learn | autocomplete | | /checks/<rule> | candidate |
| lovable supabase security | Learn | autocomplete | | /checks/<rule> | candidate |
| lovable security breach | News | autocomplete | | skip (news, not our buyer) | skip |

### 2. Supabase RLS

| Keyword | Intent | Source | Volume range | Target page | Status |
|---------|--------|--------|--------------|-------------|--------|
| ★ supabase rls not working | Fix | autocomplete | | /checks/<rule> | candidate |
| ★ supabase rls disabled | Fix | autocomplete | | /checks/<rule> | candidate |
| ★ supabase rls policy examples | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase rls best practices | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase enable rls for all tables | Fix | autocomplete | | /checks/<rule> | candidate |
| ★ supabase rls using vs with check | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase rls storage | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase storage bucket rls | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase rls for views | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase rls multi tenant | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase rls performance | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase rls rpc | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase rls nextjs | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase anon key rls | Learn | autocomplete | | /checks/<rule> | candidate |
| supabase rls checker | Tool | autocomplete | | / | candidate |
| supabase rls scanner | Tool | autocomplete | | / | candidate |
| supabase do i need rls | Learn | autocomplete | | /blog | candidate |

### 3. Supabase service role key

| Keyword | Intent | Source | Volume range | Target page | Status |
|---------|--------|--------|--------------|-------------|--------|
| ★ supabase service role key vs anon key | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase rls service role | Learn | autocomplete | | /checks/<rule> | candidate |
| ★ supabase service role key not bypassing rls | Fix | autocomplete | | /checks/<rule> | candidate |
| ★ how to rotate supabase service role key | Fix | autocomplete | | /checks/<rule> | candidate |
| ★ supabase_service_role_key lovable | Fix | autocomplete | | /checks/<rule> | candidate |
| supabase edge function rls | Learn | autocomplete | | /checks/<rule> | candidate |
| supabase service role key vs secret key | Learn | autocomplete | | /blog | candidate |
| what is a supabase service role key | Learn | autocomplete | | /blog | candidate |

### 4. Vibe-coded app security

| Keyword | Intent | Source | Volume range | Target page | Status |
|---------|--------|--------|--------------|-------------|--------|
| vibe coded app security scanner | Tool | autocomplete | | / | candidate |
| vibe coded app checker | Tool | autocomplete | | / | candidate |
| vibe coded app scanner | Tool | autocomplete | | / | candidate |
| vibe coded app security check | Tool | autocomplete | | /demo | candidate |
| vibe coded app audit | Hire | autocomplete | | /hire | candidate |
| vibe coded app security checklist | Learn | autocomplete | | /blog | candidate |
| vibe coded app checklist | Learn | autocomplete | | /blog | candidate |
| how to secure vibe coded app | Learn | autocomplete | | /blog | candidate |
| vibe coded app security issues | Learn | autocomplete | | /blog | candidate |
| vibe coded app gets hacked | Fix | autocomplete | | /blog | candidate |
| vibe coded app security | Learn | autocomplete | | /blog | candidate |
| vibe coded app wall of shame | Learn | autocomplete | | skip (curiosity) | skip |

### 5. AI-generated code security

| Keyword | Intent | Source | Volume range | Target page | Status |
|---------|--------|--------|--------------|-------------|--------|
| ai generated code security risks | Learn | autocomplete | | /blog | candidate |
| security vulnerabilities in ai generated code | Learn | autocomplete | | /blog | candidate |
| ai generated code security issues | Learn | autocomplete | | /blog | candidate |
| can ai generated code contain security vulnerabilities | Learn | autocomplete | | /blog | candidate |

### 6. Fix and hire

| Keyword | Intent | Source | Volume range | Target page | Status |
|---------|--------|--------|--------------|-------------|--------|
| fix my lovable app | Hire | autocomplete | | /hire | candidate |
| vibe coded my app hired a dev | Hire | autocomplete | | /hire | candidate |
| i vibe coded an app now what | Learn | autocomplete | | /blog | candidate |

### 7. Bolt, v0 and Cursor: a gap

The "bolt.new app" seed gave only mobile-app and download suggestions, and none about security. No v0 or Cursor seeds were run.
Next step: run seeds like "bolt.new security" and "v0 security", and "cursor generated code security", by hand or in the script.

## Page map

| Page | Primary keyword | Secondary keywords | Title (≤ 60) | Meta description (≤ 155) |
|------|-----------------|--------------------|--------------|--------------------------|
| `/` | vibe coded app security scanner | lovable security scanner · vibe coded app checker · supabase rls scanner | Shipwright: Security Scanner for Vibe-Coded Apps (48) | Scan your Lovable, Bolt, v0 or Cursor app. Shipwright proves each security problem and opens a pull request to fix it. (118) |
| `/demo` | lovable security report | lovable security check · vibe coded app security check | Sample Lovable Security Report \| Shipwright (43) | See a sample security report for an AI-built app: the score, proof for each problem, and the pull request that fixes it. (120) |
| `/ask` | is lovable app secure | how secure is lovable · lovable security risks | Is My Lovable App Secure? Ask Shipwright (40) | Ask plain-English questions about your app security. Get answers on Supabase RLS, exposed keys and what to fix first. (117) |
| `/pricing` | TODO: no pricing keyword in the data | | Pricing: Free Scan, Fix Pack, Guardian \| Shipwright (51) | Start with a free scan. A Fix Pack is $149 once, Guardian is $39 a month, and expert help starts at $499. (105) |
| `/checks/<rule>` | one ★ keyword per page | 2–3 near keywords from the same cluster | Example: Supabase RLS Not Working? Check and Fix It (42) | Example: Why Supabase RLS is not working, how to check it in your app, and the pull request that fixes it. Free scan included. (117) |
| `/blog` | vibe coded app security checklist | how to secure vibe coded app · vibe coded app security issues · lovable security issues | Vibe-Coded App Security Checklist \| Shipwright (46) | A plain-English security checklist for apps built with Lovable, Bolt, v0 or Cursor: what to check before you launch. (116) |
| `/hire` | fix my lovable app | vibe coded app audit · vibe coded my app hired a dev | Fix My Lovable App: Senior Developer \| Shipwright (49) | A senior developer fixes the hard security problems in your vibe-coded app, from $499 and quoted per project. (109) |

Notes: `/pricing` has no keyword yet, because no autocomplete suggestion was about price. Try seeds like "lovable security audit cost" by
hand. The `/checks` row is a template: each page takes its own title and description from its keyword. `/blog` is the index;
each article needs its own keyword from the clusters above.

## The 20 for the Day 24 `/checks` pages

Marked ★ above. Each one becomes one page, one rule. Check the real search results before you commit to the list.

| # | Keyword | Cluster |
|---|---------|---------|
| 1 | supabase rls not working | RLS |
| 2 | supabase rls disabled | RLS |
| 3 | supabase rls policy examples | RLS |
| 4 | supabase rls best practices | RLS |
| 5 | supabase enable rls for all tables | RLS |
| 6 | supabase rls using vs with check | RLS |
| 7 | supabase rls storage | RLS |
| 8 | supabase storage bucket rls | RLS |
| 9 | supabase rls for views | RLS |
| 10 | supabase rls multi tenant | RLS |
| 11 | supabase rls performance | RLS |
| 12 | supabase rls rpc | RLS |
| 13 | supabase rls nextjs | RLS |
| 14 | supabase anon key rls | RLS |
| 15 | supabase service role key vs anon key | Service role key |
| 16 | supabase rls service role | Service role key |
| 17 | supabase service role key not bypassing rls | Service role key |
| 18 | how to rotate supabase service role key | Service role key |
| 19 | supabase_service_role_key lovable | Service role key |
| 20 | lovable row level security | Lovable |

Left out of the 20 (still good candidates for later): *supabase edge function rls* and *lovable supabase security*.

## To do

- Fill the volume column from Keyword Planner.
- Add "People also ask" and Reddit rows by hand (source column).
- Find a keyword for `/pricing`, and seeds for Bolt, v0 and Cursor.
