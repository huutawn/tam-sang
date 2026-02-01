package com.nht.identity.service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.nht.identity.constant.PredefindRole;
import com.nht.identity.dto.request.UserCreationRequest;
import com.nht.identity.dto.request.UserUpdateRequest;
import com.nht.identity.dto.response.UserExistResponse;
import com.nht.identity.dto.response.UserResponse;
import com.nht.identity.entity.KycStatus;
import com.nht.identity.entity.Role;
import com.nht.identity.entity.User;
import com.nht.identity.exception.AppException;
import com.nht.identity.exception.ErrorCode;
import com.nht.identity.mapper.UserMapper;
import com.nht.identity.repository.KycProfileRepository;
import com.nht.identity.repository.RoleRepository;
import com.nht.identity.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserService {
    UserRepository userRepository;
    RoleRepository roleRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;
    KycProfileRepository kycProfileRepository;

    public UserResponse createUser(UserCreationRequest request) {
        if (userRepository.existsByEmail(request.email())) throw new AppException(ErrorCode.USER_EXISTED);

        User user = userMapper.toUser(request);
        log.info(request.password());
        user.setPassword(passwordEncoder.encode(request.password()));

        HashSet<Role> roles = new HashSet<>();
        roleRepository.findById(PredefindRole.USER_ROLE).ifPresent(roles::add);

        user.setRoles(roles);

        return userMapper.toUserResponse(userRepository.save(user));
    }

    public UserResponse getMyInfo() {
        var context = SecurityContextHolder.getContext();
        String name = context.getAuthentication().getName();

        User user = userRepository.findByEmail(name).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return userMapper.toUserResponse(user);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse updateUser(String userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        userMapper.updateUser(user, request);
        user.setPassword(passwordEncoder.encode(request.password()));

        var roles = roleRepository.findAllById(request.roles());
        user.setRoles(new HashSet<>(roles));

        return userMapper.toUserResponse(userRepository.save(user));
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(String userId) {
        userRepository.deleteById(userId);
    }

    public List<UserResponse> getUsers() {
        log.info("In method get Users");
        List<User> users = userRepository.findAll();
        return users.stream().map(u -> toUserResponse(u)).collect(Collectors.toList());
    }

    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse getUser(String id) {
        return userMapper.toUserResponse(
                userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED)));
    }

    public UserExistResponse isUserExist(String userEmail) {
        Optional<User> user = userRepository.findByEmail(userEmail);
        if (user.isPresent()) {
            return new UserExistResponse(user.get().getId(), true);
        } else {
            return new UserExistResponse(null, false);
        }
    }

    /**
     * Check if a user has completed KYC verification successfully.
     * This method is used by other microservices to verify user KYC status.
     *
     * @param userId the user ID to check
     * @return true if user has APPROVED KYC status, false otherwise
     */
    public boolean isUserKycVerified(String userId) {
        return kycProfileRepository.existsByUserIdAndStatus(userId, KycStatus.APPROVED);
    }

    private UserResponse toUserResponse(User u) {
        return new UserResponse(
                u.getId(),
                u.getEmail(),
                u.getFirstName(),
                u.getLastName(),
                u.isBlackList(),
                u.getICHash(),
                u.getKycStatus(),
                u.getRoles());
    }
}
