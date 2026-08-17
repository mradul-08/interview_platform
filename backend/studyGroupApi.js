import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/study-groups',
  withCredentials: true,
});

/**
 * Fetches all public study groups.
 * @returns {Promise<Array>} A list of study groups.
 */
export const getGroups = async () => {
  try {
    const response = await apiClient.get('/');
    return response.data;
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

/**
 * Creates a new study group.
 * @param {object} groupData - The data for the new group.
 * @returns {Promise<object>} The newly created group.
 */
export const createGroup = async (groupData) => {
  try {
    const response = await apiClient.post('/', groupData);
    return response.data;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

/**
 * Fetches the dashboard data for a single study group.
 * @param {string} groupId - The ID of the group.
 * @returns {Promise<object>} The group dashboard data.
 */
export const getGroupDashboard = async (groupId) => {
  try {
    const response = await apiClient.get(`/${groupId}/dashboard`);
    return response.data;
  } catch (error) {
    console.error('Error fetching group dashboard:', error);
    throw error;
  }
};

/**
 * Sends a request to join a group.
 * @param {string} groupId - The ID of the group to join.
 * @returns {Promise<object>} The result of the join request.
 */
export const requestToJoin = async (groupId) => {
  try {
    const response = await apiClient.post(`/${groupId}/join`);
    return response.data;
  } catch (error) {
    console.error('Error requesting to join group:', error);
    throw error;
  }
};

/**
 * Leaves a group.
 * @param {string} groupId - The ID of the group to leave.
 * @returns {Promise<object>} The result of the leave request.
 */
export const leaveGroup = async (groupId) => {
  try {
    const response = await apiClient.post(`/${groupId}/leave`);
    return response.data;
  } catch (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
};

// Functions for members and requests will be added in their respective phases