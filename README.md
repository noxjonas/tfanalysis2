# tfanalysis2

Early workings of an application dedicated to the analysis thermal
shift data.

Intention is to use django backend to manage and process data, PostgreSQL
to store it and Angular for the frontend. All three to be built using Docker for
deployment on internal or cloud networks.

Eventually... this could become a tool for high-throughput analysis of 
protein targets and bioactive compounds with applications in biotechnology
and medicinal chemistry.

# Preview

You can try out the app in its current state using docker:
```commandline
git pull
cd tfanalysis2
docker compose -f .\.docker\docker-compose.dev.yml build
docker compose -f .\.docker\docker-compose.dev.yml up
```

![](https://github.com/noxjonas/tfanalysis2/blob/master/etc/preview.gif)
