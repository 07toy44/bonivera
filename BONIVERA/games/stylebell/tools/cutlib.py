import numpy as np
from PIL import Image
from scipy import ndimage as ndi
def load(p): return np.array(Image.open(p).convert('RGB')).astype(np.int32)
def bg_mask(im):
    """True = latar checkerboard (terhubung ke tepi, ATAU kantong kecil berisi kotak abu netral)."""
    mx=im.max(2); mn=im.min(2)
    bgish=(mn>185)&((mx-mn)<24)
    lab,n=ndi.label(bgish)
    b=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(b))
    # kantong tertutup (mis. celah lengan-badan) yg berisi kotak abu netral checker -> latar juga
    neutral=(abs(im[...,0]-im[...,1])<=2)&(abs(im[...,1]-im[...,2])<=2)&(mn>=215)&(mn<=240)
    cnt=ndi.sum(neutral,lab,range(1,n+1)); area=ndi.sum(bgish,lab,range(1,n+1))
    for i in range(n):
        if (i+1) not in b and cnt[i]>=25 and cnt[i]/area[i]>0.12: bg|=(lab==i+1)
    return bg
def refine(im,fg):
    """Tepi halus: erosi 1px, warna tepi diambil dari piksel inti terdekat (hilangkan halo putih/abu), alpha di-anti-alias."""
    core=ndi.binary_erosion(fg,iterations=1)
    idx=ndi.distance_transform_edt(~core,return_distances=False,return_indices=True)
    rgb=np.where(core[...,None],im,im[idx[0],idx[1]])
    a=ndi.gaussian_filter(core.astype(np.float32),0.75)
    a[~ndi.binary_dilation(core,iterations=2)]=0
    return rgb.astype(np.uint8),a
def rgba(rgb,a): return np.dstack([rgb,(np.clip(a,0,1)*255).astype(np.uint8)])

def hsv(a):
    a=a/255.; mx=a.max(-1); mn=a.min(-1); d=mx-mn+1e-9
    r,g,b=a[...,0],a[...,1],a[...,2]
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    return h,np.where(mx>0,d/(mx+1e-9),0),mx
def up2(arr,k=2):
    """Upscale RGBA uint8 dengan Lanczos pada alpha-premultiplied (tanpa halo)."""
    a=arr[...,3].astype(np.float32)/255; H,W=a.shape
    ch=[arr[...,i].astype(np.float32)*a for i in range(3)]+[a*255]
    out=[np.array(Image.fromarray(c,'F').resize((W*k,H*k),Image.LANCZOS)) for c in ch]
    A=np.clip(out[3]/255,0,1); rgb=[np.clip(c/np.maximum(A,1e-3),0,255) for c in out[:3]]
    rgb=[np.where(A>0.004,c,0) for c in rgb]
    return np.dstack(rgb+[A*255]).round().astype(np.uint8)
def crop(arr,box): x0,y0,x1,y1=box; return arr[y0:y1,x0:x1]
def save(arr,p,**kw): Image.fromarray(arr).save(p,**kw)
