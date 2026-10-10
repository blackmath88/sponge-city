# Shares excluding forest (lrtyp1code 01 Wälder) and water (04 Gewässer); cross-tab. Uses parsed.pkl from analyze.py.
import pickle, collections, shapely, json
attr,wkb=pickle.load(open("src/parsed.pkl","rb"))
A=[shapely.from_wkb(w).area for w in wkb]
def shares(sel):
    t=collections.defaultdict(float)
    for a,x in zip(attr,A):
        if sel(a): t[a["versiegelung"]]+=x
    T=sum(t.values()); return dict(total_km2=round(T/1e6,3),**{k:round(100*v/T,2) for k,v in sorted(t.items())})
res={"all":shares(lambda a:True),
 "excl_forest_water":shares(lambda a:a["lrtyp1code"] not in("01","04")),
 "excl_forest_only":shares(lambda a:a["lrtyp1code"]!="01"),
 "forest_only":shares(lambda a:a["lrtyp1code"]=="01"),"water_only":shares(lambda a:a["lrtyp1code"]=="04")}
ct=collections.defaultdict(float)
for a,x in zip(attr,A): ct[(a["lrtyp1code"]+" "+a["lrtyp1text"],a["versiegelung"])]+=x
res["crosstab_km2"]={f"{k[0]} | {k[1]}":round(v/1e6,4) for k,v in sorted(ct.items())}
# 'sealed' + 'partly' alternative
for name,sel in [("all",lambda a:True),("excl_forest_water",lambda a:a["lrtyp1code"] not in("01","04"))]:
    s=shares(sel); res["sealed_plus_partly_"+name]=round(s["versiegelt"]+s["teilweise"],2)
json.dump(res,open("results_shares.json","w"),indent=1,ensure_ascii=False); print(json.dumps(res,indent=1,ensure_ascii=False))
