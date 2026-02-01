package com.nht.core_service.controller;

import com.nht.core_service.dto.response.CampaignPageResponse;
import com.nht.core_service.dto.response.PageResponse;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.nht.core_service.document.Campaign;
import com.nht.core_service.dto.request.CreateCampaignRequest;
import com.nht.core_service.dto.response.ApiResponse;
import com.nht.core_service.dto.response.CampaignResponse;
import com.nht.core_service.service.CampaignService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/campaigns")
@RequiredArgsConstructor
public class CampaignController {

	private final CampaignService campaignService;

	@PreAuthorize("isAuthenticated()")
	@PostMapping
	public ResponseEntity<ApiResponse<Campaign>> createCampaign(@Valid @RequestBody CreateCampaignRequest request) {
		Campaign campaign = campaignService.createCampaign(request);
		return ResponseEntity.ok(new ApiResponse<>("Campaign created successfully", campaign));
	}
	@GetMapping
	public ResponseEntity<PageResponse<CampaignPageResponse>> getCampaigns(
			@RequestParam(value = "page", required = false, defaultValue = "1")int page,
			@RequestParam(value = "size", required = false, defaultValue = "10") int size){
		PageResponse<CampaignPageResponse> response = campaignService.getCampaigns(size,page);
		return ResponseEntity.ok(response);
	}


	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<CampaignResponse>> getCampaign(@PathVariable String id) {
		CampaignResponse response = campaignService.getCampaignById(id);
		return ResponseEntity.ok(new ApiResponse<>("Campaign retrieved successfully", response));
	}
	@PreAuthorize("hasRole('ADMIN')")
	@PostMapping("/{id}/close")
	public ResponseEntity<ApiResponse<Void>> closeCampaign(@PathVariable String id) {
		campaignService.closeCampaign(id);
		return ResponseEntity.ok(new ApiResponse<>("Campaign closed successfully", null));
	}
}
