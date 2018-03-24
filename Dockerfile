# Run with command:
# docker run -d -p 3000:3000 -p 8081:8081 myapp

# docker build --no-cache -t myapp .

FROM node:slim

RUN mkdir /app

WORKDIR /app

COPY . /app

RUN apt-get -y update && apt-get -y install --no-install-recommends git

RUN git clone https://github.com/yoksel/test-git.git test-git

WORKDIR /app/test-git

# Get all branches
RUN for branch in $(git branch --all | grep '^\s*remotes' | egrep --invert-match '(:?HEAD|master)$'); do git branch --track "${branch##*/}" "$branch"; done

WORKDIR /app

RUN npm install --production

EXPOSE 3000 8080 8081

CMD npm start
