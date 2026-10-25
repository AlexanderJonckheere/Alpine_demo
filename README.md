# poster maker + live class gallery
[← back to the presentation](../../README.md)

Classmates make a poster on their phone, press **submit**, and it appears a few seconds later in a carousel on the projector.

## the files
| file | what |
|---|---|
| `index.html` | the poster maker (Alpine), now with a "submit" button |
| `gallery.html` | the live carousel for the projector, with a QR code to the poster maker |
| `poster-core.js` | shared code: presets, drawing the poster, a safety check, and the database calls |
| `supabase-config.js` | **your** project url and key go here |
| `supabase-setup.sql` | creates the table and the security rules, run it once in Supabase |

While `supabase-config.js` is empty, both pages run in **demo mode**: the poster maker works, submit is disabled, and the gallery shows the presets as example posters.

## how it works
```
phone: index.html ──submit──▶ Supabase (table "posters") ──live update──▶ projector: gallery.html
```
- A poster is not saved as an image. It's saved as its settings (a small json object, < 1 kB). The gallery draws it again with the same code from `poster-core.js`.
- The gallery loads all posters when it opens, then gets new ones pushed live (Supabase Realtime). Every 30 seconds it also reloads the list, which picks up posters you hid.
- Alpine does all the ui: the carousel (`x-data`, `x-for` thumbnails, `x-effect` for the fade, autoplay with `setInterval`, arrow keys, swiping), the submit dialog (`x-show`, `x-model`, `x-transition`) and the toasts.

## set up the gallery (±15 minutes)

### 1. make a Supabase project
1. Go to [supabase.com](https://supabase.com), sign up (free), and click **New project**.
2. Pick a name (for example `poster-gallery`), a database password (you won't need it here) and a region close by (for example Frankfurt).
3. Wait a minute until the project is ready.

### 2. create the table
1. In the dashboard, open **SQL Editor** → **New query**.
2. Paste everything from `supabase-setup.sql` and click **Run**. You should see "Success. No rows returned".
3. Open **Table Editor**. There's now a `posters` table.

### 3. connect the pages
1. Open **Project Settings** → **API Keys** (or the **Connect** button at the top).
2. Copy the **Project URL** and the **publishable** key (in older projects: the **anon public** key). Don't use the secret / service_role key.
3. Paste both into `supabase-config.js`:
   ```js
   window.SUPABASE_CONFIG = {
       url: 'https://abcdefghijklmnop.supabase.co',
       key: 'sb_publishable_...',
   };
   ```
4. Open `gallery.html`. The "demo mode" badge should be gone and it says "0 posters". Open `index.html` in another window, submit a poster, and watch it appear in the gallery.

### 4. put it online
Your classmates need a public url, and the QR code in the gallery points to wherever the gallery is hosted. Two options:
- **Netlify Drop** (fastest): go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag this whole `05-poster-maker` folder onto the page. You get a url right away.
- **GitHub Pages**: push the project to a GitHub repo → Settings → Pages → deploy from the `main` branch. The poster maker is then at `https://<username>.github.io/<repo>/05-presentation/demos/05-poster-maker/`.

## in class
- **The day before:** open the gallery once. Free Supabase projects get paused after a while without use, and opening the dashboard wakes them up.
- **Before the talk:** submit 2 or 3 posters yourself, so the gallery isn't empty if nobody joins in.
- **Show the gallery** full screen on the projector. The QR code is in the top right corner.
- **Something inappropriate?** In Supabase: Table Editor → `posters` → set `hidden` to `true` on that row. It disappears from the gallery within 30 seconds. Deleting the row works too.
- **Start fresh** (for example after testing): SQL Editor → `truncate public.posters;`

## security, in short
- The key in `supabase-config.js` is **meant to be public**. What visitors can do is decided by the rules in `supabase-setup.sql`: they can **add** posters and **read** visible ones, nothing else. They can't change, hide or delete anything.
- The database also checks the size: names of 1 to 20 characters, poster data under 4 kB.
- Every poster is checked again before it's drawn (`sanitizePoster` in `poster-core.js`): numbers are clamped, colors must be `#rrggbb`, and text is shown as text. Someone who writes straight to the database (skipping the poster maker) still can't run code on the projector. I tested this with a poisoned row.
- What it **doesn't** do: limit how many posters one person sends, or filter words. That's what the `hidden` column is for.

## testing without Supabase
I tested the flow with a fake Supabase client: submitting from one window, the poster appearing live in the gallery in another, reloading, and a poisoned row. Connecting to a real project is the only thing that's not tested yet, because that needs your account.
