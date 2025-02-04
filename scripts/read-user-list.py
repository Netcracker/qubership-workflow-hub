import yaml
import sys

def read_yaml_file(file_path):
    with open(file_path, 'r') as file:
        data = yaml.safe_load(file)
    return data

def get_repos(user_map):
    repos = []
    # print(user_map)
    for collab in user_map['contributors']:
        # print(collab)
        repos.append(collab['repository'])
    # print("Repos: " + repos.rstrip(","))
    return ','.join(repos)

def get_repo_users(user_map,repo_name):
    repo_users = ""
    for collab in user_map['contributors']:
        if collab['repository'] == repo_name:
            for user in collab['users']:
                repo_users += user + ","
    # print("Repo users: " + repo_users.rstrip(","))
    return repo_users.rstrip(',')

def convert_to_array(string):
    return f'["{string.replace(",", "\",\"")}"]'

def main():
    file_path = sys.argv[1]
    user_map = read_yaml_file(file_path)
    switch = sys.argv[2]
    if switch == "repos":
        print(get_repos(user_map))
    elif switch == "users":
        if len(sys.argv) > 2:
            print(get_repo_users(user_map,sys.argv[3]))

if __name__ == "__main__":
   main()
