# geo-lookup

## Steps to deploy

**Locally**
```
$ docker build -t semprehealth/geo-lookup-image .
$ docker push semprehealth/geo-lookup-image
```

**On AWS box running docker**
```
$ docker stop geo-lookup-container`
$ docker rm geo-lookup-container`
$ docker pull semprehealth/geo-lookup-image`
$ docker run -d --name geo-lookup-container -p 80:8081 --env SLACK_ENDPOINT=<SLACK_WEBHOOK> semprehealth/geo-lookup-image
```

## Check health
```
$ curl geolookup.semprehealth.com/health`
{"ok":true}
```

## My new section
here is the section
