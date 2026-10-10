# Paged, bounded download of btk_2020 (EPSG:2056) into src/pages/. Logs every request.
import urllib.request, json, hashlib, os, time, sys
B="https://www.ogd.stadt-zuerich.ch/wfs/geoportal/Biotoptypenkartierung_2020?SERVICE=WFS&REQUEST=GetFeature&VERSION=1.1.0&TYPENAME=btk_2020&outputFormat=GeoJSON&srsName=EPSG:2056&sortBy=objectid"
N=96178; PAGE=5000
os.makedirs("src/pages",exist_ok=True); log=[]
for i,s in enumerate(range(0,N,PAGE)):
    url=f"{B}&startIndex={s}&maxFeatures={PAGE}"
    req=urllib.request.Request(url,headers={"User-Agent":"sponge-city-review-recompute"})
    with urllib.request.urlopen(req,timeout=300) as r:
        data=r.read(); st=r.status
    n=len(json.loads(data)["features"])
    open(f"src/pages/p{i:02d}.json","wb").write(data)
    log.append(dict(url=url,http=st,features=n,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
    print(i,st,n,len(data),flush=True); time.sleep(2)
h=hashlib.sha256()
for i in range(len(log)): h.update(open(f"src/pages/p{i:02d}.json","rb").read())
json.dump(dict(requests=log,combined_sha256_of_concatenated_pages=h.hexdigest(),total_features=sum(l["features"] for l in log)),open("src/download_log.json","w"),indent=1)
print(h.hexdigest(),sum(l["features"] for l in log))
