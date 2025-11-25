/**
 * UserManager - Manage user roles and registration
 */
import { defineComponent } from '../core/component.js';
import { html, each } from '../core/template.js';
import { notify } from '../core/utils.js';
import * as api from '../api.js';
import '../components/select-box.js';
import '../components/lazy-select-box.js';

export default defineComponent('user-manager', {
    data() {
        return {
            users: [],
            roles: [],
            userToAdd: '',
            userToAddRole: ''
        };
    },

    async mounted() {
        // Initialize listener tracking on the component instance
        this._eventListeners = [];

        await this.updateUserList();
        await this.loadRoles();
    },

    methods: {
        async loadRoles() {
            try {
                this.state.roles = await api.list_roles();
            } catch (error) {
                console.error('Failed to load roles:', error);
            }
        },

        async updateUserList() {
            try {
                this.state.users = await api.get_all_users();
            } catch (error) {
                console.error('Failed to load users:', error);
            }
        },

        async addUser(e) {
            e.preventDefault();
            if (!this.state.userToAdd) return;

            try {
                await api.register_user(this.state.userToAdd, this.state.userToAddRole);
                notify(`Added user "${this.state.userToAdd}".`);
                this.state.userToAdd = '';
                this.state.userToAddRole = '';
            } catch (error) {
                notify('User registration failed.', 'error');
            }

            await this.updateUserList();
        },

        async updUser(user) {
            if (!user) return;

            try {
                await api.set_user_role(user.username, user.role);
                notify(`User "${user.username}" is now ${user.role}.`);
            } catch (error) {
                notify('User update failed.', 'error');
            }

            await this.updateUserList();
        },

        handleRoleChange(user, event) {
            // Update the user's role and save
            user.role = event.detail.value;
            this.updUser(user);
        }
    },

    template() {
        return html`
            <div>
                <h1>Manage Users</h1>
                <div class="section">
                    <p>This page allows you to manage the user roles for this service.</p>
                </div>
                <div class="section">
                    <h3>User Listing</h3>
                    <table border="1">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${each(this.state.users, (user, index) => html`
                                <tr>
                                    <td>${user.username}</td>
                                    <td>
                                        <x-lazy-select-box
                                            id="user-role-${index}"
                                            value="${user.role}"
                                            options="${JSON.stringify(this.state.roles)}">
                                        </x-lazy-select-box>
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
                <div class="section">
                    <h3>Add User</h3>
                    <form on-submit-prevent="addUser">
                        <label>User: <input type="text" x-model="userToAdd"></label>
                        <label>Role:
                            <x-select-box
                                id="new-user-role"
                                value="${this.state.userToAddRole}"
                                options="${JSON.stringify(this.state.roles)}">
                            </x-select-box>
                        </label>
                        <input type="submit" value="Add"/>
                    </form>
                </div>
            </div>
        `;
    },

    afterRender() {
        // Clean up old event listeners
        if (this._eventListeners) {
            this._eventListeners.forEach(({ element, handler }) => {
                element.removeEventListener('change', handler);
            });
            this._eventListeners = [];
        }

        // Manually set up change listeners for the select boxes
        this.state.users.forEach((user, index) => {
            const selectBox = this.querySelector(`#user-role-${index}`);
            if (selectBox) {
                const handler = (e) => {
                    this.handleRoleChange(user, e);
                };
                selectBox.addEventListener('change', handler);
                this._eventListeners.push({ element: selectBox, handler });
            }
        });

        const newUserRoleSelect = this.querySelector('#new-user-role');
        if (newUserRoleSelect) {
            const handler = (e) => {
                this.state.userToAddRole = e.detail.value;
            };
            newUserRoleSelect.addEventListener('change', handler);
            this._eventListeners.push({ element: newUserRoleSelect, handler });
        }
    }
});
