import urllib.request
urls = [
  'https://source.unsplash.com/featured/900x1600/?kitchen,interior',
  'https://source.unsplash.com/featured/900x1600/?bathroom,interior',
  'https://source.unsplash.com/featured/900x1600/?floorplan,architecture'
]
for u in urls:
    req = urllib.request.Request(u, headers={'User-Agent':'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as r:
            print(u, r.status, r.getheader('Content-Type'), r.geturl())
    except Exception as e:
        print(u, 'ERROR', e)
