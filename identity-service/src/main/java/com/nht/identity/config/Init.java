package com.nht.identity.config;

import java.util.HashSet;
import java.util.Set;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.nht.identity.constant.PredefindRole;
import com.nht.identity.entity.Role;
import com.nht.identity.entity.User;
import com.nht.identity.repository.RoleRepository;
import com.nht.identity.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class Init {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    ApplicationRunner applicationRunner() {
        return args -> {
            if (userRepository.findByEmail("admin@admin.com").isEmpty()) {
                log.info("Admin user not found, creating default admin...");

                // Create ADMIN role if not exists
                Role adminRole =
                        roleRepository.findById(PredefindRole.ADMIN_ROLE).orElse(null);
                if (adminRole == null) {
                    adminRole = roleRepository.save(Role.builder()
                            .name(PredefindRole.ADMIN_ROLE)
                            .description("Administrator role")
                            .build());
                }

                Set<Role> roles = new HashSet<>();
                roles.add(adminRole);

                User admin = User.builder()
                        .email("admin@admin.com")
                        .password(passwordEncoder.encode("isadmin"))
                        .firstName("System")
                        .lastName("Admin")
                        .roles(roles)
                        .build();

                userRepository.save(admin);
                log.info("Default admin user created successfully.");
            } else {
                log.info("Admin user already exists.");
            }
        };
    }
}
