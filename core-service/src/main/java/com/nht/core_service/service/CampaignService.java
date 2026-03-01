package com.nht.core_service.service;

import com.nht.core_service.document.Campaign;
import com.nht.core_service.dto.request.CreateCampaignRequest;
import com.nht.core_service.dto.response.CampaignPageResponse;
import com.nht.core_service.dto.response.CampaignResponse;
import com.nht.core_service.dto.response.PageResponse;

public interface CampaignService {

	Campaign createCampaign(CreateCampaignRequest request);

	CampaignResponse getCampaignById(String id);
	PageResponse<CampaignPageResponse> getCampaigns(int size, int page);
	PageResponse<CampaignPageResponse> getMyCampaigns(int size, int page);
	void closeCampaign(String id);
}
