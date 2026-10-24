# Reproducible reference screenshots + responsive checks. Usage: run the dev server, then
#   python3 docs/development-handoff/capture/capture_screenshots.py
# Writes mobile-* (390x844), small-* (320x568), desktop-* (1280x800) PNGs to ../screenshots and prints PASS/FAIL checks.
import asyncio, json
from playwright.async_api import async_playwright
import os, pathlib
SS=str(pathlib.Path(__file__).resolve().parent.parent/"screenshots")+"/"
B=os.environ.get("BASE_URL","http://localhost:8080")
VPS=[(320,568),(390,844),(768,1024),(1280,800)]
ROUTES=["/intro","/welcome","/login","/register","/","/study","/study/lesson/loops-js"]
R=[]
def ok(n,c): R.append(("PASS " if c else "FAIL ")+n)
async def main():
  async with async_playwright() as p:
    br=await p.chromium.launch()
    for w,h in VPS:
      ctx=await br.new_context(viewport={"width":w,"height":h},reduced_motion="reduce",has_touch=w<700)
      pg=await ctx.new_page()
      await pg.goto(B+"/welcome"); await pg.evaluate("localStorage.setItem('proofquest:onboarding:v1','seen')")
      for r in ROUTES:
        await pg.goto(B+r); await pg.wait_for_timeout(1300)
        ov=await pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
        ok(f"{w}x{h} {r} no h-overflow ({ov})", ov<=0)
        if r=="/intro":
          bb=await pg.get_by_role("button",name="Next").bounding_box(); sk=await pg.get_by_role("button",name="Skip introduction").bounding_box()
          ok(f"{w}x{h} intro controls in view", bb["y"]+bb["height"]<=h and sk["y"]>=0)
          anim=await pg.evaluate("getComputedStyle(document.querySelector('[aria-roledescription=slide]')).animationName")
          ok(f"{w}x{h} reduced motion disables slide anim ({anim})", anim=="none")
        if r=="/welcome":
          bb=await pg.get_by_role("link",name="Continue as guest").bounding_box(); ok(f"{w}x{h} guest CTA reachable", bb is not None)
        if r in ("/","/study","/study/lesson/loops-js"):
          await pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); await pg.wait_for_timeout(200)
          gap=await pg.evaluate("""(()=>{const m=document.querySelector('main');const n=document.querySelector('nav[aria-label=Primary]');const last=[...m.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().height>0).map(e=>e.getBoundingClientRect().bottom);return n.getBoundingClientRect().top-Math.max(...last)})()""")
          ok(f"{w}x{h} {r} bottom-nav clearance {gap:.0f}px", gap>=0)
        name=(r.strip("/").replace("/","-") or "home")
        if (w,h) in [(390,844),(1280,800),(320,568)]:
          await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(150)
          await pg.screenshot(path=SS+f"{'mobile' if w==390 else ('small' if w==320 else 'desktop')}-{name}.png")
      await ctx.close()
    await br.close()
asyncio.run(main()); print("\n".join(R))
