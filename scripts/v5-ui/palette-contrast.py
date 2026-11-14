import re,json
s=open('src/app/globals.css').read();light,dark=s.split('.dark {',1);dark=dark.split('@theme',1)[0]
def lum(h):
 c=[int(h[i:i+2],16)/255 for i in (1,3,5)];c=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c];return sum(x*w for x,w in zip(c,[.2126,.7152,.0722]))
def contrast(a,b):
 a,b=sorted([lum(a),lum(b)]);return (b+.05)/(a+.05)
rows=[]
for name,css in [('light',light),('dark',dark)]:
 v=dict(re.findall(r'--([\w-]+): (#[0-9a-fA-F]{6})',css))
 for fg,bg in [('on-accent','accent-strong'),('on-info','info-strong'),('on-danger','danger'),('on-violet','violet'),('accent-deep','accent-soft'),('violet','violet-soft'),('danger','surface'),('foreground-muted','surface-2'),('foreground-faint','surface')]:
  r=contrast(v[fg],v[bg]);rows.append(dict(theme=name,fg=fg,bg=bg,ratio=round(r,2),pass45=r>=4.5))
print(json.dumps(rows,indent=2));assert all(x['pass45'] for x in rows)
