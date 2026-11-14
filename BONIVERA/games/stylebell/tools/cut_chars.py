import os
for _d in ('pose','fx','outfit','bg'): os.makedirs('out/'+_d,exist_ok=True)
import sys,json; sys.path.insert(0,'.')
from cutlib import *
SRC='src/basiccaracter_expretion.png'; OUT='out'
im=load(SRC); bg=bg_mask(im); fg=~bg
fg=ndi.binary_opening(fg,structure=np.ones((2,2)))|ndi.binary_erosion(fg,iterations=2)
H,W=fg.shape
h,s,v=hsv(im)
# --- hati kartu 4: dua hati pink menempel pada rambut -> ekstrak manual dengan warna
pink=(im[...,0]>228)&(im[...,1]<178)&(im[...,2]>140)&((im[...,0]-im[...,1])>55)
rect=np.zeros_like(fg); rect[185:245,1160:1212]=True
heart4=pink&rect&fg
heart4=ndi.binary_dilation(heart4,iterations=1)&fg
rem=rect&fg&(v>0.6)&(s>0.10); rem[:,:1168]=False
# busur merah tanda "kesal" pose 5 yang menempel pada rambut
r5=np.zeros_like(fg); r5[450:512,205:258]=True
extra5=r5&fg&(im[...,0]>150)&(im[...,1]<130)&(im[...,2]<140)&((im[...,0]-im[...,1])>60)
extra5=ndi.binary_dilation(extra5,iterations=1)&fg
fg_body=fg&~ndi.binary_dilation(rem|heart4|extra5,iterations=2)
# takik pada tepi rambut akibat halo putih stiker efek -> tutup dengan closing, warnai ulang sebagai rambut
def disk(r):
    y,x=np.ogrid[-r:r+1,-r:r+1]; return (x*x+y*y)<=r*r
hairfix=np.zeros_like(fg)
def fix_edge(nx0,ny0,nx1,ny1):
    """Tambal takik di tepi kanan rambut: tepi x(y) rambut berbentuk cembung, jadi isi hingga selubung cembung atas dari x(y)."""
    ys=[];xs=[]
    for y in range(ny0,ny1):
        r=np.nonzero(fg_body[y,nx0:nx1])[0]
        if len(r): ys.append(y); xs.append(nx0+int(r.max()))
    hull=[]
    for p in zip(ys,xs):
        while len(hull)>=2 and (hull[-1][0]-hull[-2][0])*(p[1]-hull[-2][1])-(hull[-1][1]-hull[-2][1])*(p[0]-hull[-2][0])>=0: hull.pop()
        hull.append(p)
    ne=np.interp(ys,[h_[0] for h_ in hull],[h_[1] for h_ in hull])
    for y,x_,n_ in zip(ys,xs,ne):
        if int(n_)>x_: fg_body[y,x_+1:int(n_)+1]=True; hairfix[y,x_+1:int(n_)+1]=True
RECTS=((1148,172,1216,266),(196,440,266,520))
for rc in RECTS: fix_edge(*rc)
for (nx0,ny0,nx1,ny1) in RECTS:           # lubang kecil sisa halo di dalam rambut -> tutup
    sub=fg_body[ny0:ny1,nx0:nx1]; fl_=ndi.binary_fill_holes(sub); hairfix[ny0:ny1,nx0:nx1]|=fl_&~sub; fg_body[ny0:ny1,nx0:nx1]=fl_
dist_out=ndi.distance_transform_edt(fg_body); zone=np.zeros_like(fg)
for (nx0,ny0,nx1,ny1) in RECTS: zone[ny0:ny1,nx0+24:nx1]=True
hairfix|=zone&fg_body&(dist_out<=14)&(v>0.42)      # halo terang tersisa pada jalur tepi luar rambut -> warna rambut
lab,n=ndi.label(fg_body); area=ndi.sum(fg_body,lab,range(1,n+1)); sl=ndi.find_objects(lab)
bodies=[]
for i in range(n):
    if area[i]>40000:
        ys,xs=np.nonzero(lab==i+1); bodies.append((i+1,xs.mean(),ys.mean()))
assert len(bodies)==15,len(bodies)
order=sorted(bodies,key=lambda b:(int(b[2]//(H/3)),b[1]))
cells=[]
for k,(li,cx,cy) in enumerate(order):
    m=lab==li; ys,xs=np.nonzero(m)
    cells.append(dict(k=k,li=li,m=m,box=(int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1)))
# --- efek: komponen kecil dikelompokkan lalu ditempel ke badan terdekat
small=fg_body&~np.isin(lab,[c['li'] for c in cells])
small=ndi.binary_opening(small,structure=np.ones((2,2)))|(small&(h>0)&(s>0.5))
small=small|heart4|extra5
sl2,nn=ndi.label(ndi.binary_dilation(small,iterations=9)&(small|ndi.binary_dilation(small,iterations=9)))
fxs=[]
for g in range(1,nn+1):
    gm=(sl2==g)&small
    if gm.sum()<150: continue
    ys,xs=np.nonzero(gm); box=(xs.min(),ys.min(),xs.max()+1,ys.max()+1)
    def dist(c):
        bx=c['box']; dx=max(bx[0]-box[2],box[0]-bx[2],0); dy=max(bx[1]-box[3],box[1]-bx[3],0); return dx*dx+dy*dy
    k=min(cells,key=dist)['k']; fxs.append((k,gm,box))
print('efek per sel:',sorted(f[0] for f in fxs))
# --- segmentasi kelas per pose
meta=[]
dbg=[]
for c in cells:
    k=c['k']; x0,y0,x1,y1=c['box']; bh=y1-y0
    F=c['m']; dark=(v<0.42)&F
    purple=F&(h>=232)&(h<=292)&(s>=0.14)&(v>=0.40)
    pl,pn=ndi.label(ndi.binary_closing(purple,iterations=1)&F)
    cls=np.zeros(F.shape,np.uint8)  # 0 lain, 1 kaos, 2 celana
    Lum=im@np.array([.299,.587,.114]); Yg=np.arange(H)[:,None]*np.ones((1,W))
    ycut=None
    for j in range(1,pn+1):
        mj=(pl==j)&purple
        if mj.sum()<30: continue
        ys,xs=np.nonzero(mj); r0=(ys.min()-y0)/bh; r1=(ys.max()-y0)/bh
        if r0<0.28 or mj.sum()<80: continue
        if r1-r0>0.38 and r0<0.62 and r1>0.85:       # satu blob = kaos + celana menyatu -> cari garis hem
            lo=int(ys.min()+0.22*(ys.max()-ys.min())); hi=int(ys.max()-0.38*(ys.max()-ys.min()))
            gy=np.abs(Lum[1:]-Lum[:-1]); En=np.array([ (gy[y][mj[y]]).sum() for y in range(lo,hi)])
            En=np.convolve(En,np.ones(3)/3,'same'); ycut=lo+int(np.argmax(En))
            cls[mj&(Yg<ycut)]=1; cls[mj&(Yg>=ycut)]=2
        else:
            pants=ys.max()>y0+bh*0.80 and ys.mean()>y0+bh*0.62
            cls[mj]=2 if pants else 1
    thick=ndi.binary_dilation(ndi.binary_opening(dark,structure=np.ones((5,5))),iterations=1)&dark
    thin=dark&~thick&(cls==0)
    pf=cls>0; of=F&~dark&~purple
    dp,ip=ndi.distance_transform_edt(~pf,return_indices=True); do=ndi.distance_transform_edt(~of)
    take=thin&(dp<=2.3)&(dp<do+0.01)
    cls[take]=cls[ip[0],ip[1]][take]
    shirtM=cls==1; pantsM=cls==2
    # komponen kaos terbesar = badan kaos (torso)
    tl,tn=ndi.label(shirtM); ta=ndi.sum(shirtM,tl,range(1,tn+1)); torso=tl==(1+int(np.argmax(ta)))
    ty,tx=np.nonzero(torso)
    hemY=int(ycut) if ycut else int(ty.max())
    rows=torso[hemY-14:hemY-3]; hx=np.nonzero(rows.any(0))[0]; hx0,hx1=int(hx.min()),int(hx.max())+1
    cxm=(hx0+hx1)/2; cen=torso[:,int(cxm-0.25*(hx1-hx0)):int(cxm+0.25*(hx1-hx0))]
    collarY=int(np.nonzero(cen.any(1))[0].min())
    tb=(int(tx.min()),int(ty.min()),int(tx.max())+1,int(ty.max())+1)
    # wajah: komponen kulit terbesar di zona kepala
    skin=F&(im[...,0]>232)&(im[...,1]>198)&(im[...,2]>188)&((im[...,0]-im[...,2])>6)&(cls==0)
    zone=np.zeros(F.shape,bool); zone[y0:y0+int(bh*0.55),:]=True
    fl,fn=ndi.label(skin&zone); fa=ndi.sum(skin&zone,fl,range(1,fn+1)); fcomp=(fl==(1+int(np.argmax(fa))))
    face=ndi.binary_opening(ndi.binary_fill_holes(fcomp),iterations=1)
    skincol=np.median(im[fcomp],0)
    hr=thick[y0+int(.10*bh):y0+int(.40*bh)]; hxs=np.nonzero(hr.any(0))[0]; hcx=(hxs.min()+hxs.max())/2; hws=float(hxs.max()-hxs.min())
    hwid=hx1-hx0; reliable=(80<=hwid<=105) and ta.max()>3500 and collarY-y0<200
    if not reliable:
        sit=k in (8,10,11); cY=y0+(196 if sit else 182); hx0=int(hcx-45); hx1=int(hcx+45); collarY=cY; hemY=cY+100
    # area ganti ekspresi: row-hull kulit wajah (mencakup mata) di bawah garis atas-mata; di atasnya hanya piksel kulit asli (poni tidak tertimpa)
    ysf,xsf=np.nonzero(fcomp); ft0=int(ysf.min()); lim=0.335*hws; colw=(np.arange(W)>=hcx-lim)&(np.arange(W)<=hcx+lim)
    hull0=np.zeros(F.shape,bool)
    for yy in range(ft0,min(ft0+90,H)):
        q=np.nonzero(fcomp[yy]&colw)[0]
        if len(q)>=3: hull0[yy,int(q.min()):int(q.max())+1]=True
    thick_dk=ndi.binary_opening((v<0.40)&F,structure=np.ones((4,4)))
    eyem=hull0&thick_dk; eyem[:ft0+6]=False; eyem[ft0+48:]=False; eyem&=(np.abs(np.arange(W)-hcx)>14)[None,:]
    eys=np.nonzero(eyem)[0]; ey=float(np.median(eys)) if len(eys)>20 else ft0+22.0
    # tangan = komponen kulit lain di zona kepala -> dikecualikan dari area ganti (tangan target tidak tertimpa, tangan sumber tidak terbawa)
    hands=np.zeros(F.shape,bool)
    for j in range(1,fn+1):
        if j!=1+int(np.argmax(fa)) and fa[j-1]>=150: hands|=(fl==j)
    hands_d=ndi.binary_dilation(hands,iterations=3)
    cut=int(ey-22); lime=0.30*hws; face=np.zeros(F.shape,bool)
    face[:cut]=(fcomp&colw[None,:])[:cut]
    for yy in range(cut,int(ey+75)):
        if yy<=ey+20: face[yy,int(hcx-lime):int(hcx+lime)+1]=True
        else: face[yy]=hull0[yy]
    face&=~hands_d
    fmask=face.astype(np.float32); xl_=int(hcx-lime); xr_=int(hcx+lime)
    for yy in range(cut,int(ey+21)):          # fade tepi atas & samping persegi mata -> tidak ada garis sambungan di poni/rambut samping
        wt=np.clip((yy-cut)/7.0,0,1); xs_=np.arange(xl_,xr_+1); wx=np.clip(np.minimum(xs_-xl_,xr_-xs_)/12.0,0,1)
        fmask[yy,xl_:xr_+1]*=wt*wx
    fy,fx=np.nonzero(face)
    # RGBA hasil
    rgb,a=refine(im,F)
    hf=hairfix&F
    if hf.any():
        rgb[hf]=(34,31,38); eg=F&~ndi.binary_erosion(F,iterations=2); rgb[hf&eg]=(12,10,16)
    box=(x0,y0,x1,y1)
    def layer(M,ref=None):
        Md=ndi.binary_dilation(M,iterations=1)&F
        idx=ndi.distance_transform_edt(~M,return_distances=False,return_indices=True)
        col=rgb[idx[0],idx[1]].astype(np.float32)
        lum=col@np.array([.299,.587,.114],np.float32)
        r=np.median(lum[M&(lum>150)]) if (M&(lum>150)).any() else 200
        g=np.clip(lum/r,0,1)*255
        al=np.where(Md,np.where(M,a,np.maximum(a,0)*1.0),0)
        al=np.where(Md,np.where(a>0,1,0),0)*np.clip(a*3,0,1)
        return np.dstack([g,g,g,al*255]).astype(np.uint8)
    over_a=np.where(cls==0,a,0)
    over=rgba(rgb,over_a)
    # alpha pinggir over: biarkan; kaos/celana ditumpuk di bawah sehingga tak ada celah
    sh=layer(shirtM); pa=layer(pantsM)
    # patch wajah (alpha = mask yang di-feather)
    fm=ndi.gaussian_filter(fmask,0.8)
    fb=(fx.min(),fy.min(),fx.max()+1,fy.max()+1)
    fpatch=rgba(rgb,fm)
    rel=lambda b:(b[0]-x0,b[1]-y0,b[2]-x0,b[3]-y0)
    # kaki: pusat-x sepatu (10% bawah)
    low=np.nonzero(F[y1-int(bh*0.06):y1])[1]
    # tinggi/lebar torso
    tb=(int(tx.min()),int(ty.min()),int(tx.max())+1,int(ty.max())+1)
    m=dict(k=k,w=(x1-x0),h=bh,feet=[float(low.mean()-x0),float(bh)],
           torso=[hx0-x0,hx1-x0,collarY-y0,hemY-y0],ok=bool(reliable),hc=float(hcx-x0),hws=hws,ft=int(fb[1]-y0),ey=float(ey-y0),lo=bool(k not in (9,11,13,14)),sleeve=list(rel(tb)),
           face=list(rel(fb)),skin=[int(q) for q in skincol])
    meta.append(m)
    for nm,arr_ in (('over',over),('shirt',sh),('pants',pa)):
        save(up2(crop(arr_,box)),f'{OUT}/pose/p{k:02d}_{nm}.png')
    save(up2(crop(fpatch,fb)),f'{OUT}/pose/p{k:02d}_face.png')
    # debug
    tint=np.zeros(F.shape+(3,),np.uint8)
    dv=np.dstack([rgb]).copy().astype(np.float32)
    dv[cls==1]=dv[cls==1]*0.4+np.array([255,40,40])*0.6
    dv[cls==2]=dv[cls==2]*0.4+np.array([40,80,255])*0.6
    dv[face]=dv[face]*0.5+np.array([40,220,60])*0.5
    dv[torso]=dv[torso]*0.5+np.array([255,230,0])*0.5
    base=np.where(F[...,None],dv,np.array([255,0,255])).astype(np.uint8)
    dbg.append(Image.fromarray(crop(base,(x0,y0,x1,y1))))
json.dump(meta,open(f'{OUT}/pose_meta.json','w'),default=lambda o:o.item())
# efek
fxmeta=[]
for k,gm,box in fxs:
    pad=6; x0,y0,x1,y1=max(box[0]-pad,0),max(box[1]-pad,0),min(box[2]+pad,W),min(box[3]+pad,H)
    A=ndi.binary_dilation(gm,iterations=3); A=ndi.binary_fill_holes(A)
    sub=np.zeros(gm.shape+(4,),np.float32)
    halo=ndi.gaussian_filter(A.astype(np.float32),0.9)
    sub[...,:3]=255; sub[...,3]=halo*255
    colr,ca=refine(im,gm)
    ca=ca[...,None]
    sub[...,:3]=np.where(ca>0.02,colr,255)*np.clip(ca*1.2,0,1)+255*(1-np.clip(ca*1.2,0,1))
    out=np.clip(sub,0,255).astype(np.uint8)
    cm=meta[k]; cx0,cy0=cells[k]['box'][:2]
    fcx=cm['hc']+cx0; fcy=cm['ft']+cy0; fw=cm['hws']
    ec=((box[0]+box[2])/2,(box[1]+box[3])/2)
    idx=len([q for q in fxmeta])
    save(up2(crop(out,(x0,y0,x1,y1))),f'{OUT}/fx/fx{idx:02d}.png')
    fxmeta.append(dict(i=idx,k=k,w=x1-x0,h=y1-y0,rel=[float((ec[0]-fcx)/fw),float((ec[1]-fcy)/fw)],ratio=float((x1-x0)/fw)))
json.dump(fxmeta,open(f'{OUT}/fx_meta.json','w'),default=lambda o:o.item())
# montage debug
tw=sum(d.width for d in dbg[:5])+60; rows=[]
mont=Image.new('RGB',(5*260,3*420),(40,40,40))
for i,d in enumerate(dbg):
    r=min(1.0,min(255/d.width,415/d.height)); dd=d.resize((int(d.width*r),int(d.height*r)),Image.LANCZOS)
    mont.paste(dd,((i%5)*260+2,(i//5)*420+2))
mont.save('out/dbg_cls.png'); print('ok',len(meta),'poses',len(fxmeta),'efek')
for m in meta: print(m['k'],m['w'],m['h'],'torso[x0,x1,collarY,hemY]',m['torso'],'ok',m['ok'],'hc',round(m['hc']),'hws',round(m['hws']),'ft',m['ft'])
