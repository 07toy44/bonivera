import sys,json; sys.path.insert(0,'.')
from cutlib import *
OUT='out'
im=load('src/basicishou.png'); bg=bg_mask(im); fg=~bg
fg=ndi.binary_opening(fg,structure=np.ones((2,2)))|ndi.binary_erosion(fg,iterations=2)
H,W=fg.shape
lab,n=ndi.label(ndi.binary_dilation(fg,iterations=7)); area=ndi.sum(fg,lab,range(1,n+1))
comps=[]
for i in range(n):
    if area[i]>30000:
        ys,xs=np.nonzero((lab==i+1)&fg); comps.append((i+1,xs.mean(),ys.mean()))
assert len(comps)==8,len(comps)
comps=sorted(comps,key=lambda c:(int(c[2]//(H/2)),c[1]))
REF=90.0
PAR={0:dict(name='Idol Biru',b=.40,ay=.80,as_=.36,k=1.0,inner='#223a99',skirt=True),
 1:dict(name='Cheongsam Merah',b=.45,ay=.80,as_=.33,k=1.0,inner='#241217',skirt=True),
 2:dict(name='Sailor Ungu',b=.40,ay=.82,as_=.44,k=1.0,inner='#f2eefc',skirt=True),
 3:dict(name='Blazer Pink',b=.40,ay=.80,as_=.36,k=1.0,inner='#f7b8d2',skirt=True),
 4:dict(name='Gingham Merah',b=.40,ay=.82,as_=.45,k=1.0,inner='#fbd0de',skirt=True),
 5:dict(name='Kaos JKT48',b=.40,ay=.73,as_=.73,k=1.0,inner='#5a259f',skirt=False),
 6:dict(name='Blus Frill',b=.40,ay=.69,as_=.69,k=1.0,inner='#fff8ee',skirt=False),
 7:dict(name='Kaos Putih',b=.40,ay=.61,as_=.61,k=1.0,inner='#f4f0ff',skirt=False)}
meta=[]; tiles=[]
for k,(li,cx,cy) in enumerate(comps):
    m=(lab==li)&fg; m=ndi.binary_fill_holes(m)|m
    # buang komponen kecil lepas (noda checker)
    l2,n2=ndi.label(m); a2=ndi.sum(m,l2,range(1,n2+1)); m=l2==(1+int(np.argmax(a2)))
    ys,xs=np.nonzero(m); box=(int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1)
    if k==1:
        mx_=im.max(2); mn_=im.min(2); bgl,nb=ndi.label((mn_>185)&((mx_-mn_)<24))
        for q,sq in enumerate(ndi.find_objects(bgl),1):
            if sq[1].start>=box[0] and sq[1].stop<=box[2] and sq[0].start>=box[1] and sq[0].stop<=box[1]+0.25*(box[3]-box[1]) and (bgl==q).sum()<3000: m=m&~(bgl==q)
        m=ndi.binary_opening(m,iterations=1)
    rgb,a=refine(im,m)
    arr=rgba(rgb,a)
    mm=crop(m,box); h,w=mm.shape; wid=mm.sum(1)
    lo,hi=int(h*0.42),int(h*0.66); wy=lo+int(np.argmin(wid[lo:hi])); 
    xs_w=np.nonzero(mm[wy])[0]
    cxw=float((xs_w.min()+xs_w.max())/2); twm=int(wid[wy]); sub=crop(arr,box)
    p=PAR[k]; s0=REF/twm*p['k']; SS=2
    xl=int(round(cxw-twm/2)); xr=int(round(cxw+twm/2)); xc=[0,xl,xr,w]; yc=[0,wy,h]
    xwid=[max(2,int(round(v*SS))) for v in ((xl)*s0*p['b'],(xr-xl)*s0,(w-xr)*s0*p['b'])]
    yhei=[max(2,int(round(v*SS))) for v in (wy*s0*p['ay'],(h-wy)*s0*p['as_'])]
    sw_=sub[...,3:4].astype(np.float32)/255; pm=np.concatenate([sub[...,:3]*sw_,sub[...,3:4].astype(np.float32)],2)
    def rs(a,W2,H2): return np.stack([np.array(Image.fromarray(a[...,c],'F').resize((W2,H2),Image.LANCZOS)) for c in range(4)],2)
    cols=[rs(pm[:,xc[i]:xc[i+1]],xwid[i],h) for i in range(3)]; row=np.concatenate(cols,1)
    parts=[rs(row[yc[i]:yc[i+1]],row.shape[1],yhei[i]) for i in range(2)]; out=np.concatenate(parts,0)
    A=np.clip(out[...,3]/255,0,1); rgbo=np.clip(out[...,:3]/np.maximum(A[...,None],1e-3),0,255)
    final=np.dstack([np.where(A[...,None]>0.004,rgbo,0),A*255]).round().astype(np.uint8)
    save(final,f'{OUT}/outfit/o{k}.png')
    meta.append(dict(i=k,name=p['name'],inner=p['inner'],skirt=p['skirt'],w=final.shape[1],h=final.shape[0],cx=float(xwid[0]+xwid[1]/2),tw=int(xwid[1]),wy=int(yhei[0])))
    mm=final[...,3]>40
    box=(0,0,final.shape[1],final.shape[0]); rgb=final[...,:3]
    t=Image.fromarray(np.where(mm[...,None],rgb,np.array([255,0,255])).astype(np.uint8)); r=min(1,230/t.width,300/t.height)
    tiles.append(t.resize((int(t.width*r),int(t.height*r)),Image.LANCZOS))
json.dump(meta,open(f'{OUT}/outfit_meta.json','w'))
mont=Image.new('RGB',(4*240,2*310),(40,40,40))
for i,t in enumerate(tiles): mont.paste(t,((i%4)*240+4,(i//4)*310+4))
mont.save('out/dbg_outfit.png')
for m in meta: print(m)
# --- background: crop persegi tanpa stretching (cover), 1200x1200
for name,box,fn in (('theater',(0,0,1448,1086),'bgtheater'),('stage',(208,0,1463,941),'stagetheater')):
    b=Image.open(f'src/{fn}.png').convert('RGB').crop(box).resize((1600,1200),Image.LANCZOS)
    b.save(f'{OUT}/bg/{name}.jpg',quality=88,optimize=True); print(name,b.size)
