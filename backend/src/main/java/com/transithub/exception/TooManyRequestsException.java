package com.transithub.exception;

import org.springframework.http.HttpStatus;

/** Someone tried the same thing too many times in a short time (HTTP 429). */
public class TooManyRequestsException extends ApiException {

    public TooManyRequestsException(String message) {
        super(message);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.TOO_MANY_REQUESTS;
    }
}