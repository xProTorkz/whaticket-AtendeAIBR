import api, { openApi } from "../../services/api";

const usePlans = () => {

    const getPlanList = async (params) => {
        const { data } = await openApi.request({
            url: '/plans/list',
            method: 'GET',
            params
        });
        return data;
    }

    const list = async (params) => {
        try {
            const { data } = await api.request({
                url: '/plans/all',
                method: 'GET',
                params
            });
            return data;
        } catch (err) {
            return [];
        }
    }

    const finder = async (id) => {
        try {
            const { data } = await api.request({
                url: `/plans/${id}`,
                method: 'GET'
            });
            return data;
        } catch (err) {
            return {};
        }
    }

    const save = async (data) => {
        const { data: responseData } = await api.request({
            url: '/plans',
            method: 'POST',
            data
        });
        return responseData;
    }

    const update = async (data) => {
        const { data: responseData } = await api.request({
            url: `/plans/${data.id}`,
            method: 'PUT',
            data
        });
        return responseData;
    }

    const remove = async (id) => {
        const { data } = await api.request({
            url: `/plans/${id}`,
            method: 'DELETE'
        });
        return data;
    }

    const getPlanCompany = async (params, id) => {
        try {
            const { data } = await api.request({
                url: `/companies/listPlan/${id}`,
                method: 'GET',
                params
            });
            return data;
        } catch (err) {
            return {
                plan: {
                    useCampaigns: false,
                    useKanban: true,
                    useOpenAi: false,
                    useIntegrations: false,
                    useSchedules: false,
                    useInternalChat: true,
                    useExternalApi: true
                }
            };
        }
    }

    return {
        getPlanList,
        list,
        save,
        update,
        finder,
        remove,
        getPlanCompany
    }
}

export default usePlans;