# Independent recomputation. Toolchain: shapely 2.x (GEOS) + exact Decimal signed ring areas.
import json, glob, collections, sys, hashlib
from decimal import Decimal, getcontext
import shapely
from shapely.geometry import shape
from shapely.strtree import STRtree
from shapely.ops import unary_union
getcontext().prec=50
feats=[];
for f in sorted(glob.glob("src/pages/p*.json")):
    d=json.load(open(f),parse_float=Decimal)   # keep exact decimals for method B
    feats+=d["features"]
out={}
out["n_features"]=len(feats)
ids=[f["properties"]["objectid"] for f in feats]
out["unique_objectids"]=len(set(ids)); out["id_range"]=[min(ids),max(ids)]
out["crs_declared"]=d.get("crs")
def ring_area(r):  # exact signed shoelace on Decimals, relative to first vertex
    x0,y0=r[0]; s=Decimal(0)
    for (xa,ya),(xb,yb) in zip(r,r[1:]):
        s+=(xa-x0)*(yb-y0)-(xb-x0)*(ya-y0)
    return s/2
def exact_area(g):  # outer ring minus holes, by orientation-independent abs; holes via ring index
    t=g["type"]; polys=g["coordinates"] if t=="MultiPolygon" else [g["coordinates"]]
    a=Decimal(0)
    for p in polys:
        a+=abs(ring_area(p[0]))-sum(abs(ring_area(h)) for h in p[1:])
    return a
cls=collections.defaultdict(lambda:dict(n=0,A=0.0,B=Decimal(0)))
geo=[];attr=[]
nullgeom=[];invalid=[];bad_types=collections.Counter();coord_min=[1e18]*2;coord_max=[-1e18]*2
mism=0;maxdiff=0.0;holes=0;neg_orient=0
for f in feats:
    p=f["properties"]; v=p.get("versiegelung"); g=f["geometry"]
    key=v if v is not None else "(null)"
    c=cls[key]; c["n"]+=1
    if not g or not g.get("coordinates"):
        nullgeom.append(p["objectid"]); c["nogeom"]=c.get("nogeom",0)+1; continue
    bad_types[g["type"]]+=1
    gs=shape(json.loads(json.dumps(g,default=float)))
    for poly in (g["coordinates"] if g["type"]=="MultiPolygon" else [g["coordinates"]]):
        holes+=len(poly)-1
    if not gs.is_valid: invalid.append((p["objectid"],shapely.is_valid_reason(gs)))
    a=gs.area; b=exact_area(g)
    c["A"]+=a; c["B"]+=b
    maxdiff=max(maxdiff,abs(a-float(b)))
    bx=gs.bounds
    coord_min=[min(coord_min[0],bx[0]),min(coord_min[1],bx[1])]; coord_max=[max(coord_max[0],bx[2]),max(coord_max[1],bx[3])]
    geo.append(gs); attr.append(p)
out["null_or_empty_geometry"]=len(nullgeom); out["null_geom_ids"]=nullgeom
out["geom_types"]=dict(bad_types); out["interior_rings"]=holes
out["invalid_geometries"]=len(invalid); out["invalid_examples"]=invalid[:10]
out["bounds_E_N"]=[coord_min,coord_max]
out["max_abs_diff_shapely_vs_exact_per_feature_m2"]=maxdiff
tot_A=sum(c["A"] for c in cls.values()); tot_B=sum(c["B"] for c in cls.values())
out["classes"]={k:dict(n=c["n"],nogeom=c.get("nogeom",0),area_m2_shapely=c["A"],area_m2_exactdecimal=str(c["B"]),
   share_pct=round(100*float(c["B"])/float(tot_B),4)) for k,c in sorted(cls.items())}
out["total_m2_exact"]=str(tot_B); out["total_km2"]=float(tot_B)/1e6; out["total_m2_shapely"]=tot_A
# Overlaps / duplicates
tree=STRtree(geo); over=0; over_area=0.0; dup=0; examples=[]
pairs=tree.query(geo,predicate="intersects")
for i,j in zip(*pairs):
    if i>=j: continue
    inter=geo[i].intersection(geo[j]).area
    if inter>1e-3:
        over+=1; over_area+=inter
        if len(examples)<8: examples.append((attr[i]["objectid"],attr[j]["objectid"],round(inter,3)))
    if geo[i].equals(geo[j]): dup+=1
out["overlapping_pairs_gt_1e-3m2"]=over; out["overlap_area_sum_m2"]=over_area; out["duplicate_geoms"]=dup; out["overlap_examples"]=examples
U=unary_union(geo); out["union_area_m2"]=U.area; out["sum_minus_union_m2"]=tot_A-U.area
out["union_parts"]=len(getattr(U,"geoms",[U])); out["union_holes"]=sum(len(p.interiors) for p in getattr(U,"geoms",[U]))
out["union_holes_area_m2"]=sum(shapely.Polygon(i).area for p in getattr(U,"geoms",[U]) for i in p.interiors)
# biotope type vocab to identify forest / water
voc=collections.Counter((a["lrtyp1code"],a["lrtyp1text"]) for a in attr); out["lrtyp1_vocab"]=[(list(k),v) for k,v in sorted(voc.items())]
voc2=collections.defaultdict(float)
for a,g in zip(attr,geo): voc2[(a["lrtyp1code"],a["lrtyp1text"])]+=g.area
out["lrtyp1_area_km2"]=[(list(k),round(v/1e6,3)) for k,v in sorted(voc2.items())]
json.dump(out,open("results_raw.json","w"),indent=1,default=str)
# keep for phase 2
import pickle; pickle.dump((attr,[g.wkb for g in geo]),open("src/parsed.pkl","wb"))
print(json.dumps({k:v for k,v in out.items() if k not in("lrtyp1_vocab","lrtyp1_area_km2")},indent=1,default=str))
