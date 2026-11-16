#!/usr/bin/env ruby
# Add the native presentation to the ORIGINAL app, keeping all embedded targets.
require 'xcodeproj'
project_path = File.expand_path('../App/App.xcodeproj', __dir__)
project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |t| t.name == 'App' } or abort 'Original App target missing'
group = project.main_group.find_subpath('App', false) or abort 'Original App group missing'
%w[REDFitNativeApp.swift REDFitHomeView.swift REDFitBodyView.swift REDFitWorkoutViews.swift REDFitGarminLink.swift REDFitNutritionViews.swift REDFitRealityCoach.swift redfit-poses.json].each do |name|
  ref = group.files.find { |f| f.path == name } || group.new_file(name)
  phase = name.end_with?('.swift') ? target.source_build_phase : target.resources_build_phase
  phase.add_file_reference(ref) unless phase.files_references.include?(ref)
end
target.build_configurations.each { |config| config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '26.0' }
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.save_as(project_path, 'App', true)
puts 'Native SwiftUI views and original procedural poses attached to App (iOS 26+)'
