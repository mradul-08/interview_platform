import { create } from 'zustand';
import { getGroups, createGroup as createGroupApi } from '../services/studyGroupApi';

const useStudyGroupStore = create((set) => ({
  groups: [],
  isLoading: false,
  error: null,

  fetchGroups: async () => {
    set({ isLoading: true, error: null });
    try {
      const groups = await getGroups();
      set({ groups, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createGroup: async (groupData) => {
    set({ isLoading: true });
    try {
      const newGroup = await createGroupApi(groupData);
      set((state) => ({ groups: [newGroup, ...state.groups], isLoading: false }));
      return newGroup;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));

export default useStudyGroupStore;