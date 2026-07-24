FROM ruby:3.4-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/jekyll

ENV BUNDLE_PATH=/usr/local/bundle
ENV BUNDLE_JOBS=4
ENV BUNDLE_RETRY=3

COPY Gemfile Gemfile.lock ./
RUN bundle install

EXPOSE 4000

CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0", "--port", "4000", "--force_polling"]
