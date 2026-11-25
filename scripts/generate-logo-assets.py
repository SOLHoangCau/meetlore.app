import math,subprocess,glob
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
A=__import__('os').path.join(ROOT,'assets/'); L=A+'logo/'
SON,CHAM,GIAY,NGHE,MUC='#B23521','#24426B','#F5F0E6','#E3AE45','#1B2A33'
def arc(cx,cy,r,a0,a1):
    p=lambda a:(cx+r*math.cos(math.radians(a)),cy+r*math.sin(math.radians(a)))
    x0,y0=p(a0);x1,y1=p(a1); return f'M{x0:.1f} {y0:.1f}A{r} {r} 0 0 1 {x1:.1f} {y1:.1f}'
N=[0]
def rings(ink,bg,dot,s=1,ox=0,oy=0):
    # Hai vòng lồng vào nhau: mỗi vòng đi trên vòng kia ở một giao điểm. Khe hở tạo bằng mask nên nền trong suốt vẫn đúng.
    r,w,d=190,56,100; c1,c2=412,612; h=math.degrees(math.atan2(math.sqrt(r*r-d*d),d)); sp=26; N[0]+=1; i=N[0]
    tb=arc(c2,512,r,180+h-sp,180+h+sp); ba=arc(c1,512,r,h-sp,h+sp)
    m=lambda n,d2:f'<mask id="{n}{i}" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="#fff"/><path d="{d2}" fill="none" stroke="#000" stroke-width="{w+32}"/></mask>'
    o=f'<g transform="translate({ox} {oy}) scale({s})" fill="none" stroke="{ink}" stroke-width="{w}">'+m('a',tb)+m('b',ba)+f'<circle cx="{c1}" cy="512" r="{r}" mask="url(#a{i})"/><circle cx="{c2}" cy="512" r="{r}" mask="url(#b{i})"/></g>'
    if dot: o+=f'<circle cx="{ox+512*s}" cy="{oy+512*s}" r="{30*s}" fill="{dot}"/>'
    return o
def paths(ink,bg,dot,ring,s=1,ox=0,oy=0):
    # Hai con đường từ hai phía gặp nhau tại một điểm: Hub.
    a='M214 742C392 742 420 620 512 512S632 282 810 282'; b='M214 282C392 282 420 404 512 512S632 742 810 742'
    o=f'<g transform="translate({ox} {oy}) scale({s})" fill="none" stroke-linecap="round" stroke-width="62"><path d="{a}" stroke="{ink}"/><path d="{b}" stroke="{ink}"/></g>'
    return o+f'<circle cx="{ox+512*s}" cy="{oy+512*s}" r="{104*s}" fill="{ring}"/><circle cx="{ox+512*s}" cy="{oy+512*s}" r="{58*s}" fill="{dot}"/>'
def svg(body,w=1024,h=1024): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'
def word(text,x,base,size,fill):
    f=TTFont(glob.glob(ROOT+'/node_modules/@expo-google-fonts/lora/**/*700Bold.ttf',recursive=True)[0]); gs=f.getGlyphSet(); cm=f.getBestCmap(); k=size/f['head'].unitsPerEm; d=[]
    for ch in text:
        g=cm[ord(ch)]; p=SVGPathPen(gs); gs[g].draw(TransformPen(p,(k,0,0,-k,x,base))); d.append(p.getCommands()); x+=gs[g].width*k
    return f'<path d="{" ".join(d)}" fill="{fill}"/>'
def save(name,s):
    open(L+name+'.svg','w').write(s)
def png(s,out,w,h=None):
    open('/tmp/meetlore-logo.svg','w').write(s); subprocess.run(['rsvg-convert','-w',str(w),'-h',str(h or w),'/tmp/meetlore-logo.svg','-o',out],check=True)
sq=lambda c,rx=0:f'<rect width="1024" height="1024" rx="{rx}" fill="{c}"/>'
a_mark=sq(SON,224)+rings(GIAY,SON,NGHE); b_mark=sq(CHAM,224)+paths(GIAY,CHAM,SON,GIAY)
save('logo-1-an-giao',svg(a_mark)); save('logo-2-diem-giao',svg(b_mark))
def lock(mark): return svg(f'<g transform="scale(.3125)">{mark}</g>'+word('MeetLore',372,205,128,MUC),1000,320)
save('logo-1-ngang',lock(a_mark)); save('logo-2-ngang',lock(b_mark))
for n in ['logo-1-an-giao','logo-2-diem-giao']: png(open(L+n+'.svg').read(),L+n+'.png',1024)
for n in ['logo-1-ngang','logo-2-ngang']: png(open(L+n+'.svg').read(),L+n+'.png',2000,640)
sets={'':(lambda bg:sq(SON)+rings(GIAY,SON,NGHE), rings(GIAY,SON,NGHE,.98,10,10), rings('#FFFFFF',None,None,.98,10,10)),
      '-2':(lambda bg:sq(CHAM)+paths(GIAY,CHAM,SON,GIAY), paths(GIAY,CHAM,SON,GIAY,.8,102,102), paths('#FFFFFF',None,'#FFFFFF','#FFFFFF',.8,102,102))}
for suf,(ic,fg,mono) in sets.items():
    d=A if not suf else L+'bo-2-'
    png(svg(ic(0)),d+'icon.png',1024); png(svg(fg),d+'adaptive-icon.png',1024); png(svg(mono),d+'monochrome-icon.png',1024)
png(svg(a_mark),A+'splash-icon.png',1024); png(svg(a_mark),A+'favicon.png',48); png(svg(rings('#FFFFFF',None,None,1.1,-51,-51)),A+'notification-icon.png',96)
png(svg(b_mark),L+'bo-2-splash-icon.png',1024); png(svg(b_mark),L+'bo-2-favicon.png',48)
