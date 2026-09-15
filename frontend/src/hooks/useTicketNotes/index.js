import api from "../../services/api";

const useTicketNotes = () => {

    const saveNote = async (data) => {
        const ticketId = data.ticketId;
        const body = data.note || data.body;
        const { data: responseData } = await api.request({
            url: ticketId ? `/tickets/${ticketId}/notes` : '/ticket-notes',
            method: 'POST',
            data: { body, ...data }
        });
        return responseData;
    }

    const deleteNote = async (id, ticketId) => {
        const url = ticketId ? `/tickets/${ticketId}/notes/${id}` : `/ticket-notes/${id}`;
        const { data } = await api.request({
            url,
            method: 'DELETE'
        });
        return data;
    }

    const listNotes = async (params) => {
        const ticketId = params?.ticketId;
        if (!ticketId) return [];
        const { data } = await api.request({
            url: `/tickets/${ticketId}/notes`,
            method: 'GET',
            params
        });
        return Array.isArray(data) ? data.map(item => ({
            ...item,
            note: item.note || item.body
        })) : [];
    }

    return {
        saveNote,
        deleteNote,
        listNotes
    }
}

export default useTicketNotes;