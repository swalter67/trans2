FROM node:latest
WORKDIR /app

RUN apt-get update; apt-get upgrade -y
RUN mkdir -p /scripts
COPY entrypoint.sh /scripts/entrypoint.sh
RUN chmod +x /scripts/entrypoint.sh

#EXPOSE 3000

ENTRYPOINT [ "/scripts/entrypoint.sh" ]
CMD ["node", "dist/main"]
