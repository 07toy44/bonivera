import json,base64,io,os,shutil
from PIL import Image
OUT='out'; G='..'
os.makedirs(G+'/assets',exist_ok=True)
pm=json.load(open(OUT+'/pose_meta.json')); om=json.load(open(OUT+'/outfit_meta.json')); fm=json.load(open(OUT+'/fx_meta.json'))
POSE=['Berdiri Santai','Peace','Tangan di Depan','Hore!','Tangan di Pipi','Tangan Menyilang','Menyeka Air Mata','Sedang Berpikir','Duduk Termenung','Menutup Mulut','Duduk Manis','Peluk Bantal','Kepalan Semangat','Tersipu','Minum Boba']
EXPR=['Tenang','Ceria Wink','Datar','Girang','Malu Manis','Kesal','Menangis','Bingung','Galau','Kaget','Jatuh Cinta','Ngantuk','Semangat','Tersipu','Santai']
FXN={1:'Kilau',3:'Semangat',4:'Hati',5:'Kesal',6:'Air Mata',7:'Tanya',8:'Pusing',9:'Kaget',10:'Cinta',11:'Zzz',12:'Girang',14:'Musik'}
M={'canvas':[1600,1200],'poses':[],'expr':[],'outfits':[],'fx':[],'bg':[{'id':'theater','name':'Theater JKT48','img':'bg_theater'},{'id':'stage','name':'Panggung','img':'bg_stage'}]}
for m in pm:
    k=m['k']; t=m['torso']; f=m['face']
    M['poses'].append(dict(id=k,name=POSE[k],w=m['w']*2,h=m['h']*2,hc=m['hc']*2,hws=m['hws']*2,ft=m['ft']*2,ey=m['ey']*2,
        tc=(t[0]+t[1])/2*2,tw=(t[1]-t[0])*2,cy=t[2]*2,feet=m['feet'][0]*2,skin=m['skin'],face=[v*2 for v in f],ok=m['ok'],lo=m['lo']))
    M['expr'].append(dict(id=k,name=EXPR[k]))
for o in om: M['outfits'].append(dict(id=o['i'],name=o['name'],inner=o['inner'],skirt=o['skirt'],wy=o['wy'],w=o['w'],h=o['h'],cx=o['cx'],tw=o['tw']))
FXS=sorted(fm,key=lambda f:f['k'])
for n,f in enumerate(FXS): M['fx'].append(dict(id=n,name=FXN[f['k']],src=f['k'],rel=f['rel'],ratio=f['ratio'],w=f['w']*2,h=f['h']*2))
imgs={}; png_total=0
def add(key,path,kind='webp'):
    global png_total
    im=Image.open(path); png_total+=os.path.getsize(path)
    b=io.BytesIO()
    if kind=='webp': im.save(b,'WEBP',quality=94,alpha_quality=100,method=6); mime='image/webp'
    else: im.convert('RGB').save(b,'JPEG',quality=88,optimize=True); mime='image/jpeg'
    imgs[key]=f'data:{mime};base64,'+base64.b64encode(b.getvalue()).decode()
for k in range(15):
    for n in ('over','shirt','pants','face'): add(f'p{k}_{n}',f'{OUT}/pose/p{k:02d}_{n}.png')
for o in om: add(f'o{o["i"]}',f'{OUT}/outfit/o{o["i"]}.png')
for n,f in enumerate(FXS): add(f'fx{n}',f'{OUT}/fx/fx{f["i"]:02d}.png')
add('bg_theater',OUT+'/bg/theater.jpg','jpg'); add('bg_stage',OUT+'/bg/stage.jpg','jpg')
js='/* StyleBell asset pack — dihasilkan dari potongan PNG di assets/cut (data-URI agar canvas tidak tainted, aman dibuka via file://). */\nwindow.StyleBellPack='+json.dumps({'m':M,'i':imgs},separators=(',',':'))+';\n'
open(G+'/assets/pack.js','w').write(js)
# salin potongan PNG individual sebagai sumber aset (terpisah per elemen)
for sub in ('pose','outfit'):
    d=f'{G}/assets/cut/{sub}'; os.makedirs(d,exist_ok=True)
    for fn in sorted(os.listdir(f'{OUT}/{sub}')): shutil.copy(f'{OUT}/{sub}/{fn}',d)
d=G+'/assets/cut/fx'; os.makedirs(d,exist_ok=True)
for n,f in enumerate(FXS): shutil.copy(f'{OUT}/fx/fx{f["i"]:02d}.png',f'{d}/fx{n:02d}_{FXN[f["k"]].lower().replace(" ","-")}.png')
d=G+'/assets/cut/bg'; os.makedirs(d,exist_ok=True)
for fn in os.listdir(OUT+'/bg'): shutil.copy(OUT+'/bg/'+fn,d)
print('pack.js',round(os.path.getsize(G+'/assets/pack.js')/1e6,2),'MB | PNG total',round(png_total/1e6,2),'MB | gambar',len(imgs))
