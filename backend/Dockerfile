FROM continuumio/miniconda3
WORKDIR /

COPY app/env.yml .

RUN conda env create -f env.yml
RUN ["conda", "install", "-n", "tfanalysis2", "gunicorn", "-y"]

COPY . .

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

ENTRYPOINT ["conda", "run", "--no-capture-output", "-n", "tfanalysis2"]