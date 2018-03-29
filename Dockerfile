# Build:
# docker build --no-cache -t task-4-node .

# Run (3000 from config; 8081 for Websockets):
# docker run -d -p 3000:3000 -p 8081:8081 --net="host" --rm task-4-node

FROM node:8

RUN mkdir /app

WORKDIR /app

COPY . /app

# RUN ./script.sh

RUN npm i --production
# RUN npm run build

RUN git clone https://github.com/yoksel/test-git.git test-git

WORKDIR /app/test-git

# Get all branches
RUN for branch in $(git branch --all | grep '^\s*remotes' | egrep --invert-match '(:?HEAD|master)$'); do git branch --track "${branch##*/}" "$branch"; done

WORKDIR /app

RUN echo "NODE_ENV: $NODE_ENV"
RUN echo "testvar: $testvar"

EXPOSE 3000 8081

CMD npm start
