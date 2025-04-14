# Instructions
- always remember to streamline the code when fixing a bug
- always remember to apply minimal changes to fix a bug and not to add new files unless necessary

# Bugs and Features 
- [ ] Bug: User name doesn't display correctly in profile page 
    - Description: When a new user registers with a name (e.g. "John Doe"), the profile page shows partial "Public Key" instead of the registered name
    - Possible causes: Could be an issue with either passing the name from registration to database or retrieving user data for the profile page display
    - Priority: Medium

- [ ] Feature: add api authentication to the server
    - Description: Implement API authentication(for personal data) and throttling (for public websocket) for the server to ensure secure access to endpoints
    - Priority: High

- [ ] add /outlet endpoint to server and suggest database function or refactor to match outlet ID with its name (currently outlet in news in name, but not a foreign reference to outlet collection)
