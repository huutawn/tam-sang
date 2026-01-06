package com.nht.api_gateway;

import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

import static org.springframework.cloud.gateway.server.mvc.filter.FilterFunctions.stripPrefix;
import static org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions.route;

@Configuration
public class GatewayConfig {

    private final LoadBalancerClient loadBalancerClient;

    public GatewayConfig(LoadBalancerClient loadBalancerClient) {
        this.loadBalancerClient = loadBalancerClient;
    }

    @Bean
    public RouterFunction<ServerResponse> identityServiceRoute() {
        return route("identity-service")
                .route(request -> request.path().startsWith("/identity"), 
                       request -> {
                           ServiceInstance instance = loadBalancerClient.choose("IDENTITY-SERVICE");
                           if (instance == null) {
                               return ServerResponse.notFound().build();
                           }
                           String uri = instance.getUri().toString();
                           return HandlerFunctions.http(uri).handle(request);
                       })
                .filter(stripPrefix(1))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> campaignServiceRoute() {
        return route("core-service")
                .route(request -> request.path().startsWith("/core"),
                       request -> {
                           ServiceInstance instance = loadBalancerClient.choose("CORE-SERVICE");
                           if (instance == null) {
                               return ServerResponse.notFound().build();
                           }
                           String uri = instance.getUri().toString();
                           return HandlerFunctions.http(uri).handle(request);
                       })
                .filter(stripPrefix(1))
                .build();
    }

    @Bean
    public RouterFunction<ServerResponse> fileServiceRoute() {
        return route("file-service")
                .route(request -> request.path().startsWith("/file"), 
                       request -> {
                           ServiceInstance instance = loadBalancerClient.choose("FILE-SERVICE");
                           if (instance == null) {
                               return ServerResponse.notFound().build();
                           }
                           String uri = instance.getUri().toString();
                           return HandlerFunctions.http(uri).handle(request);
                       })
                .filter(stripPrefix(1))
                .build();
    }
}
